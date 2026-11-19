import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Real files in a sandbox: HOME, project dir and store all live in a temp dir
const SBX = fs.mkdtempSync(path.join(os.tmpdir(), 'evk-board-'));
const HOME = path.join(SBX, 'home');
const PROJ = path.join(HOME, 'proj');
const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_SHELL = process.env.SHELL;
process.env.HOME = HOME;
process.env.SHELL = '/bin/zsh';

// os.homedir() ignores Jest's process.env, so point it at the sandbox
// explicitly — otherwise `~` would resolve to the real home directory
jest.unstable_mockModule('os', () => ({
  ...os,
  homedir: () => HOME,
  default: { ...os, homedir: () => HOME }
}));
process.env.EVK_STORE_PATH = path.join(HOME, '.evk', 'store.yaml');

const store = await import('../src/core/store.js');
const board = await import('../src/core/board.js');
const { writeBlock } = await import('../src/core/sync.js');
const { maskValue, isSecretKey } = await import('../src/utils/mask.js');
const { BLOCK_START } = await import('../src/utils/parser.js');

const ZSHRC = path.join(HOME, '.zshrc');
const ENV = path.join(PROJ, '.env');
const read = p => fs.readFileSync(p, 'utf-8');
const load = () => board.loadBoard({ cwd: PROJ });
const rowOf = (b, key, tag) => b.rows.find(r => r.key === key && (tag === undefined ? true : (r.entry ? r.entry.tags.join('+') === tag : r.untracked)));
const targetOf = (b, display) => b.targets.find(t => t.display === display);

beforeEach(() => {
  fs.rmSync(HOME, { recursive: true, force: true });
  fs.mkdirSync(PROJ, { recursive: true });
  fs.writeFileSync(ZSHRC, 'export PATH="$HOME/bin:$PATH"\n');
  fs.writeFileSync(ENV, 'PORT=3000\nAPI_KEY=outside-old\n');
  store.initStore();
});

afterAll(() => {
  process.env.HOME = ORIGINAL_HOME;
  process.env.SHELL = ORIGINAL_SHELL;
  delete process.env.EVK_STORE_PATH;
  fs.rmSync(SBX, { recursive: true, force: true });
});

describe('mask', () => {
  test('masks secrets but keeps a recognisable prefix and suffix', () => {
    expect(maskValue('OPENAI_API_KEY', 'sk-proj-Hd82kLmQx9vTz4RbN8cYw1aB3fA9')).toBe('sk-proj-••••••••3fA9');
    expect(maskValue('GITHUB_TOKEN', 'ghp_9fKx2LmQ7vTz4RbN8cY')).toBe('ghp_••••••••N8cY');
  });

  test('hides only the credentials of a URL', () => {
    expect(maskValue('DATABASE_URL', 'postgres://app:secret@db:5432/app')).toBe('postgres://app:••••••@db:5432/app');
    expect(maskValue('OPENAI_BASE_URL', 'https://api.openai.com/v1')).toBe('https://api.openai.com/v1');
  });

  test('hides tokens carried in a URL path or query', () => {
    expect(maskValue('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/T0001/B0002/XyZ123abcDEF456ghi789'))
      .toBe('https://hooks.slack.com/services/T0001/B0002/••••••');
    expect(maskValue('API_URL', 'https://api.example.com/v1/data?api_key=abc123')).toBe('https://api.example.com/v1/data?••••••');
    expect(isSecretKey('GITHUB_WEBHOOK')).toBe(true);
    expect(isSecretKey('SESSION_COOKIE')).toBe(true);
  });

  test('leaves non-secret keys alone and fully hides short secrets', () => {
    expect(isSecretKey('AWS_REGION')).toBe(false);
    expect(maskValue('AWS_REGION', 'us-west-2')).toBe('us-west-2');
    expect(maskValue('DB_PASSWORD', 'hunter2')).toBe('••••••••');
  });
});

describe('writeBlock', () => {
  test('replaces the block with exactly the given vars and comments out conflicts', () => {
    writeBlock(ENV, { API_KEY: 'new', DEBUG: '1' });
    writeBlock(ENV, { API_KEY: 'newer' });
    const content = read(ENV);
    expect(content).toContain('API_KEY=newer');
    expect(content).not.toContain('DEBUG=1');
    expect(content).toContain('# API_KEY=outside-old');
    expect(content).toContain('PORT=3000');
  });
});

describe('loadBoard / cellState', () => {
  test('infers ownership of older blocks by key + value and marks changed values stale', () => {
    const dev = store.addVariable('API_KEY', 'dev-1', { tags: ['dev'] });
    store.addVariable('API_KEY', 'prod-1', { tags: ['prod'] });
    store.addVariable('REGION', 'eu', {});
    writeBlock(ZSHRC, { API_KEY: 'dev-1', REGION: 'eu' });
    store.updateVariableById(dev.id, { value: 'dev-2' });

    const b = load();
    const z = targetOf(b, '~/.zshrc');
    expect(board.cellState(z, rowOf(b, 'API_KEY', 'dev'))).toBe('stale');
    expect(board.cellState(z, rowOf(b, 'API_KEY', 'prod'))).toBe('none');
    expect(board.cellState(z, rowOf(b, 'REGION'))).toBe('ok');
  });

  test('lists block keys that are not in the store as untracked rows', () => {
    writeBlock(ZSHRC, { LEGACY: 'x' });
    const b = load();
    const row = rowOf(b, 'LEGACY');
    expect(row.untracked).toBe(true);
    expect(board.cellState(targetOf(b, '~/.zshrc'), row)).toBe('untracked');
  });

  test('shows the project .env as ./.env and default shell files', () => {
    const b = load();
    expect(b.targets.map(t => t.display)).toEqual(['~/.zshrc', './.env']);
  });
});

describe('planTarget / applyPlan', () => {
  test('adding another tag of a key replaces the old value in that file', () => {
    store.addVariable('API_KEY', 'dev-1', { tags: ['dev'] });
    store.addVariable('API_KEY', 'prod-1', { tags: ['prod'] });
    writeBlock(ENV, { API_KEY: 'dev-1' });

    let b = load();
    const env = targetOf(b, './.env');
    const plan = board.planTarget(env, [
      { row: rowOf(b, 'API_KEY', 'dev'), op: 'remove' },
      { row: rowOf(b, 'API_KEY', 'prod'), op: 'add' }
    ], b.entries);
    expect(plan.changes).toEqual([{ op: '~', key: 'API_KEY', from: 'dev-1', to: 'prod-1' }]);

    board.applyPlan(plan);
    b = load();
    expect(read(ENV)).toContain('API_KEY=prod-1');
    expect(board.cellState(targetOf(b, './.env'), rowOf(b, 'API_KEY', 'prod'))).toBe('ok');
    expect(board.cellState(targetOf(b, './.env'), rowOf(b, 'API_KEY', 'dev'))).toBe('none');
  });

  test('only queued cells change; other stale values stay as written', () => {
    const a = store.addVariable('A', 'a1', {});
    store.addVariable('B', 'b1', {});
    writeBlock(ZSHRC, { A: 'a1' });
    store.updateVariableById(a.id, { value: 'a2' });

    const b = load();
    const plan = board.planTarget(targetOf(b, '~/.zshrc'), [{ row: rowOf(b, 'B'), op: 'add' }], b.entries);
    expect(plan.after).toEqual({ A: 'a1', B: 'b1' });
    board.applyPlan(plan);
    expect(read(ZSHRC)).toContain('export A="a1"');
  });

  test('removing every value removes the block and restores commented lines', () => {
    store.addVariable('API_KEY', 'from-store', {});
    let b = load();
    const add = board.planTarget(targetOf(b, './.env'), [{ row: rowOf(b, 'API_KEY'), op: 'add' }], b.entries);
    expect(add.newBlock).toBe(true);
    expect(add.toComment).toEqual(['API_KEY']);
    board.applyPlan(add);
    expect(read(ENV)).toContain('# API_KEY=outside-old');

    b = load();
    const clear = board.planTarget(targetOf(b, './.env'), [{ row: rowOf(b, 'API_KEY'), op: 'remove' }], b.entries);
    expect(clear.removeBlock).toBe(true);
    expect(clear.toRestore.map(c => c.key)).toEqual(['API_KEY']);
    board.applyPlan(clear);
    const content = read(ENV);
    expect(content).not.toContain(BLOCK_START);
    expect(content).toContain('API_KEY=outside-old');
  });

  test('a plan with nothing queued is empty', () => {
    const b = load();
    expect(board.planTarget(targetOf(b, '~/.zshrc'), [], b.entries).empty).toBe(true);
  });
});

describe('records', () => {
  test('recordSync keeps other assignments and lets synced entries own their keys', () => {
    const dev = store.addVariable('API_KEY', 'dev-1', { tags: ['dev'] });
    const prod = store.addVariable('API_KEY', 'prod-1', { tags: ['prod'] });
    const region = store.addVariable('REGION', 'eu', {});
    writeBlock(ZSHRC, { API_KEY: 'dev-1', REGION: 'eu' });

    writeBlock(ZSHRC, { API_KEY: 'prod-1', REGION: 'eu' });
    board.recordSync(ZSHRC, [prod.id], PROJ);

    const rec = store.readStore().targets['~/.zshrc'].entries;
    expect(rec).toEqual(expect.arrayContaining([prod.id, region.id]));
    expect(rec).not.toContain(dev.id);
  });

  test('canonicalPath stores home paths with ~ and others as absolute', () => {
    expect(board.canonicalPath('.env', PROJ)).toBe('~/proj/.env');
    expect(board.canonicalPath('/etc/app.env', PROJ)).toBe(path.resolve(PROJ, '/etc/app.env'));
    expect(board.displayPath('~/proj/.env', PROJ)).toBe('./.env');
  });
});
