// Board model: values (rows) × target files (columns).
//
// The store records which entries are assigned to each target file
// (`store.targets[path].entries`). What is actually *in* a file is always
// read from its managed block, so a cell's state is the comparison of the
// two: assigned + same value in the block = current; assigned + different
// or missing value = stale.
//
// Files written before assignments were recorded are inferred from their
// block by key + value.

import os from 'os';
import path from 'path';
import { readStore, writeStore } from './store.js';
import { writeBlock, cleanFile } from './sync.js';
import { readFileSafe, expandPath, fileExists } from '../utils/file.js';
import { detectTargetType, extractManagedBlock, parseVarsFromBlock } from '../utils/parser.js';

const COMMENT_MARKER = '# [evk] Commented out due to conflict:';

/* ------------------------------------------------------------------ */
/* Paths                                                               */
/* ------------------------------------------------------------------ */

/** Canonical store key for a target: `~/…` under home, absolute elsewhere. */
export function canonicalPath(p, cwd = process.cwd()) {
  const abs = p.startsWith('~') ? expandPath(p) : path.resolve(cwd, p);
  const home = os.homedir();
  if (abs === home || abs.startsWith(home + path.sep)) {
    // Forward slashes under ~ so the record reads the same on every OS
    return '~' + abs.slice(home.length).split(path.sep).join('/');
  }
  return abs;
}

/** Short label: `./.env` for files in cwd, otherwise the canonical path. */
export function displayPath(canon, cwd = process.cwd()) {
  const abs = expandPath(canon);
  if (cwd !== os.homedir() && path.dirname(abs) === cwd) {
    return './' + path.basename(abs);
  }
  return canon;
}

function defaultTargets(cwd) {
  const shell = process.env.SHELL || '';
  const list = [];
  if (fileExists('~/.zshrc') || shell.endsWith('zsh')) list.push('~/.zshrc');
  if (fileExists('~/.bashrc') || shell.endsWith('bash')) list.push('~/.bashrc');
  if (list.length === 0) list.push('~/.zshrc');
  if (cwd !== os.homedir()) list.push(canonicalPath('.env', cwd));
  return list;
}

/* ------------------------------------------------------------------ */
/* Reading targets                                                     */
/* ------------------------------------------------------------------ */

function parseLooseVars(text, type) {
  // Same grammar as the managed block, applied to lines outside it.
  return parseVarsFromBlock(text, type);
}

function parseEvkCommented(text) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() !== COMMENT_MARKER) continue;
    const m = lines[i + 1].match(/^\s*#\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (m) out.push({ key: m[1], value: m[2].replace(/^["']|["']$/g, '') });
  }
  return out;
}

/** Read one target file into the shape the board needs. */
export function readTarget(canon) {
  const type = detectTargetType(expandPath(canon));
  const content = readFileSafe(canon);
  if (content === null) {
    return { exists: false, type, blockVars: null, outside: {}, commented: [] };
  }
  const block = extractManagedBlock(content);
  const outsideText = block ? content.slice(0, block.start) + content.slice(block.end) : content;
  return {
    exists: true,
    type,
    blockVars: block ? parseVarsFromBlock(block.content, type) : null,
    outside: parseLooseVars(outsideText, type),
    commented: parseEvkCommented(outsideText)
  };
}

/** Guess which store entry each key in a block belongs to. */
export function inferAssigned(blockVars, entries) {
  const assigned = new Set();
  for (const [key, value] of Object.entries(blockVars || {})) {
    const cands = entries.filter(e => e.key === key);
    // exact value → only candidate → untagged → most recently edited
    const pick = cands.find(e => e.value === value)
      || (cands.length === 1 ? cands[0] : cands.find(e => !e.tags || e.tags.length === 0))
      || cands.slice().sort((x, y) => String(y.updated_at).localeCompare(String(x.updated_at)))[0];
    if (pick) assigned.add(pick.id);
  }
  return assigned;
}

function targetRecords(store) {
  const t = store.targets;
  return t && typeof t === 'object' && !Array.isArray(t) ? t : {};
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

const TAG_RANK = { dev: 1, development: 1, test: 2, staging: 3, prod: 4, production: 4 };
const tagRank = e => (e.tags && e.tags.length ? (TAG_RANK[e.tags[0]] || 5) : 0);

export function sortEntries(a, b) {
  return a.key.localeCompare(b.key) || tagRank(a) - tagRank(b) || (a.tags || []).join(',').localeCompare((b.tags || []).join(','));
}

/**
 * Load everything the board shows.
 * @returns {{ entries, rows, targets }}
 *   rows: [{ id, key, entry? , untracked? }]
 *   targets: [{ path, display, type, exists, blockVars, outside, commented, assigned:Set, untracked:string[] }]
 */
export function loadBoard({ cwd = process.cwd() } = {}) {
  const store = readStore();
  const entries = (store.vars || []).slice().sort(sortEntries);
  const byId = new Map(entries.map(e => [e.id, e]));
  const records = targetRecords(store);

  const paths = [...new Set([...defaultTargets(cwd), ...Object.keys(records)])];
  const targets = paths.map(p => {
    const info = readTarget(p);
    const rec = records[p];
    const assigned = rec && Array.isArray(rec.entries)
      ? new Set(rec.entries.filter(id => byId.has(id)))
      : inferAssigned(info.blockVars, entries);
    const covered = new Set([...assigned].map(id => byId.get(id).key));
    const untracked = info.blockVars ? Object.keys(info.blockVars).filter(k => !covered.has(k)) : [];
    return { path: p, display: displayPath(p, cwd), ...info, assigned, untracked, recorded: !!rec };
  });

  const rows = entries.map(e => ({ id: e.id, key: e.key, entry: e }));
  const untrackedKeys = [...new Set(targets.flatMap(t => t.untracked))];
  for (const key of untrackedKeys) {
    rows.push({ id: 'untracked:' + key, key, untracked: true });
  }
  rows.sort((a, b) => a.key.localeCompare(b.key) || (a.untracked ? 1 : 0) - (b.untracked ? 1 : 0) || (a.entry && b.entry ? sortEntries(a.entry, b.entry) : 0));

  return { entries, rows, targets };
}

/** 'ok' | 'stale' | 'none' | 'untracked' */
export function cellState(target, row) {
  if (row.untracked) return target.untracked.includes(row.key) ? 'untracked' : 'none';
  if (!target.assigned.has(row.id)) return 'none';
  const v = target.blockVars ? target.blockVars[row.key] : undefined;
  return v === row.entry.value ? 'ok' : 'stale';
}

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

/**
 * Work out what writing the queued ops to one target would do.
 * Only cells that were queued change; everything else in the block is
 * kept exactly as it is in the file.
 * @param {object} target - from loadBoard
 * @param {Array<{row, op: 'add'|'remove'|'update'}>} ops
 * @param {object[]} entries - all store entries
 */
export function planTarget(target, ops, entries) {
  const byId = new Map(entries.map(e => [e.id, e]));
  const before = target.blockVars ? { ...target.blockVars } : {};
  const after = { ...before };
  const assigned = new Set(target.assigned);
  const keyAssigned = key => [...assigned].some(id => byId.get(id) && byId.get(id).key === key);

  for (const { row, op } of ops) {
    if (row.untracked) {
      if (op === 'remove') delete after[row.key];
      continue;
    }
    const e = row.entry;
    if (op === 'add' || op === 'update') {
      for (const id of [...assigned]) {
        if (id !== e.id && byId.get(id) && byId.get(id).key === e.key) assigned.delete(id);
      }
      assigned.add(e.id);
      after[e.key] = e.value;
    } else if (op === 'remove') {
      assigned.delete(e.id);
      if (!keyAssigned(e.key)) delete after[e.key];
    }
  }

  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const changes = [];
  for (const key of keys) {
    const inB = Object.prototype.hasOwnProperty.call(before, key);
    const inA = Object.prototype.hasOwnProperty.call(after, key);
    if (inB && !inA) changes.push({ op: '-', key, from: before[key] });
    else if (!inB && inA) changes.push({ op: '+', key, to: after[key] });
    else if (before[key] !== after[key]) changes.push({ op: '~', key, from: before[key], to: after[key] });
  }

  const hasAfter = Object.keys(after).length > 0;
  const removeBlock = !!target.blockVars && !hasAfter;
  const newBlock = !target.blockVars && hasAfter;
  const toComment = changes.filter(c => c.op === '+' && Object.prototype.hasOwnProperty.call(target.outside, c.key)).map(c => c.key);
  const toRestore = removeBlock ? target.commented : [];
  const sameAssignment = assigned.size === target.assigned.size && [...assigned].every(id => target.assigned.has(id));

  return {
    target, before, after, assigned, changes, toComment, toRestore, newBlock, removeBlock,
    empty: changes.length === 0 && !removeBlock && sameAssignment
  };
}

/** Record which entries a target holds. */
export function recordTarget(targetPath, entryIds) {
  const store = readStore();
  store.targets = targetRecords(store);
  store.targets[targetPath] = { entries: [...new Set(entryIds)] };
  writeStore(store);
}

/** Forget a target column entirely (only the record; the file is untouched). */
export function forgetTarget(targetPath) {
  const store = readStore();
  store.targets = targetRecords(store);
  delete store.targets[targetPath];
  writeStore(store);
}

/** Write a plan to disk and record the new assignment. */
export function applyPlan(plan) {
  const { target } = plan;
  let commented = [];
  let restored = [];
  if (plan.removeBlock) {
    restored = cleanFile(target.path).restored;
  } else if (plan.changes.length > 0) {
    commented = writeBlock(target.path, plan.after).commented;
  }
  recordTarget(target.path, [...plan.assigned]);
  return { path: target.path, commented, restored };
}

/**
 * After a CLI sync: the synced entries now own their keys in the file;
 * every other assignment is kept (or inferred, for older files).
 */
export function recordSync(targetPath, syncedIds, cwd = process.cwd()) {
  const canon = canonicalPath(targetPath, cwd);
  const store = readStore();
  const entries = store.vars || [];
  const byId = new Map(entries.map(e => [e.id, e]));
  const rec = targetRecords(store)[canon];
  const base = rec && Array.isArray(rec.entries)
    ? new Set(rec.entries.filter(id => byId.has(id)))
    : inferAssigned(readTarget(canon).blockVars, entries);
  const syncedKeys = new Set(syncedIds.map(id => byId.get(id)?.key).filter(Boolean));
  const next = [...base].filter(id => !syncedKeys.has(byId.get(id).key)).concat(syncedIds);
  recordTarget(canon, next);
}

/** After a CLI clean: the target holds nothing. */
export function recordClean(targetPath, cwd = process.cwd()) {
  const canon = canonicalPath(targetPath, cwd);
  const store = readStore();
  if (!targetRecords(store)[canon]) return;
  recordTarget(canon, []);
}
