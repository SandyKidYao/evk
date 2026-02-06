/**
 * CLI Integration Tests
 *
 * Tests all CLI commands using a temporary store file.
 * Uses EVK_STORE_PATH environment variable to isolate test data.
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// Test helpers
const CLI_PATH = path.join(process.cwd(), 'bin', 'evk.js');

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'evk-test-'));
}

function runCLI(args, env = {}) {
  const storePath = env.EVK_STORE_PATH || process.env.EVK_STORE_PATH;
  try {
    const result = execSync(`node ${CLI_PATH} ${args}`, {
      encoding: 'utf-8',
      env: {
        ...process.env,
        ...env,
        EVK_STORE_PATH: storePath
      },
      timeout: 10000
    });
    return { stdout: result, exitCode: 0 };
  } catch (err) {
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.status || 1
    };
  }
}

describe('CLI Integration Tests', () => {
  let tempDir;
  let storePath;
  let targetFile;

  beforeAll(() => {
    // Create temp directory for test data
    tempDir = createTempDir();
    storePath = path.join(tempDir, 'store.yaml');
    targetFile = path.join(tempDir, 'test.env');

    // Set environment variable for all tests
    process.env.EVK_STORE_PATH = storePath;
  });

  afterAll(() => {
    // Clean up temp directory
    delete process.env.EVK_STORE_PATH;
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    test('store is auto-initialized on first command', () => {
      const result = runCLI('list');
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(storePath)).toBe(true);
    });

    test('store file has correct structure', () => {
      const content = fs.readFileSync(storePath, 'utf-8');
      expect(content).toContain('version: 2');
      expect(content).toContain('vars:');
    });
  });

  describe('add command', () => {
    test('adds a simple variable', () => {
      const result = runCLI('add API_KEY secret123');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added API_KEY');
    });

    test('adds variable with description', () => {
      const result = runCLI('add DB_HOST localhost -d "Database host"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added DB_HOST');
    });

    test('adds variable with tags', () => {
      const result = runCLI('add API_URL "https://dev.example.com" -t dev,api');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added API_URL');
      expect(result.stdout).toContain('Tags: dev, api');
    });

    test('adds same key with different tags (dev vs prod)', () => {
      const result1 = runCLI('add API_SECRET dev-secret -t dev');
      expect(result1.exitCode).toBe(0);

      const result2 = runCLI('add API_SECRET prod-secret -t prod');
      expect(result2.exitCode).toBe(0);
    });

    test('updates existing variable with same key+tags', () => {
      runCLI('add UPDATE_TEST value1 -t test');
      const result = runCLI('add UPDATE_TEST value2 -t test');
      expect(result.exitCode).toBe(0);

      // Verify only one entry exists
      const listResult = runCLI('list -f json');
      const vars = JSON.parse(listResult.stdout);
      const matches = vars.filter(v => v.key === 'UPDATE_TEST');
      expect(matches.length).toBe(1);
      expect(matches[0].value).toBe('value2');
    });
  });

  describe('list command', () => {
    test('lists all variables in table format', () => {
      const result = runCLI('list');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('API_KEY');
      expect(result.stdout).toContain('DB_HOST');
    });

    test('lists variables in JSON format', () => {
      const result = runCLI('list -f json');
      expect(result.exitCode).toBe(0);

      const vars = JSON.parse(result.stdout);
      expect(Array.isArray(vars)).toBe(true);
      expect(vars.length).toBeGreaterThan(0);
      expect(vars[0]).toHaveProperty('key');
      expect(vars[0]).toHaveProperty('value');
      expect(vars[0]).toHaveProperty('id');
    });

    test('lists variables in YAML format', () => {
      const result = runCLI('list -f yaml');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('API_KEY:');
      expect(result.stdout).toContain('value:');
    });

    test('filters by tags', () => {
      const result = runCLI('list -t dev -f json');
      expect(result.exitCode).toBe(0);

      const vars = JSON.parse(result.stdout);
      for (const v of vars) {
        expect(v.tags).toContain('dev');
      }
    });

    test('ls alias works', () => {
      const result = runCLI('ls');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('show command', () => {
    test('shows variable details', () => {
      const result = runCLI('show API_KEY');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('API_KEY');
      expect(result.stdout).toContain('Value:');
      expect(result.stdout).toContain('secret123');
    });

    test('shows variable with tags filter', () => {
      const result = runCLI('show API_SECRET -t dev');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dev-secret');
    });

    test('returns error for non-existent variable', () => {
      const result = runCLI('show NON_EXISTENT');
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('get command', () => {
    test('outputs only the value', () => {
      const result = runCLI('get API_KEY');
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('secret123');
    });

    test('gets value with tags filter', () => {
      const result = runCLI('get API_SECRET -t prod');
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('prod-secret');
    });

    test('exits with error for non-existent variable', () => {
      const result = runCLI('get NON_EXISTENT');
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('tags command', () => {
    test('lists all unique tags', () => {
      const result = runCLI('tags');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dev');
      expect(result.stdout).toContain('api');
      expect(result.stdout).toContain('prod');
    });

    test('lists tags in JSON format', () => {
      const result = runCLI('tags -f json');
      expect(result.exitCode).toBe(0);

      const tags = JSON.parse(result.stdout);
      expect(Array.isArray(tags)).toBe(true);
      expect(tags).toContain('dev');
    });
  });

  describe('export command', () => {
    test('exports all variables as shell statements', () => {
      const result = runCLI('export');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('export API_KEY=');
      expect(result.stdout).toContain('export DB_HOST=');
    });

    test('exports specific keys', () => {
      const result = runCLI('export API_KEY');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('export API_KEY="secret123"');
    });

    test('exports by tags', () => {
      const result = runCLI('export -t dev');
      expect(result.exitCode).toBe(0);
      // Should contain dev-tagged variables
      expect(result.stdout).toContain('export');
    });

    test('tag priority works (later tag overrides)', () => {
      // Export with dev,prod - prod should win for API_SECRET
      const result = runCLI('export API_SECRET -t dev,prod');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('prod-secret');
    });
  });

  describe('sync command', () => {
    test('syncs to custom .env file', () => {
      const result = runCLI(`sync --file "${targetFile}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Synced to');

      // Verify file was created with managed block
      const content = fs.readFileSync(targetFile, 'utf-8');
      expect(content).toContain('evk Managed Block');
      expect(content).toContain('API_KEY=');
      expect(content).toContain('End evk Managed Block');
    });

    test('syncs specific keys', () => {
      const keyOnlyFile = path.join(tempDir, 'keyonly.env');
      const result = runCLI(`sync API_KEY --file "${keyOnlyFile}"`);
      expect(result.exitCode).toBe(0);

      const content = fs.readFileSync(keyOnlyFile, 'utf-8');
      expect(content).toContain('API_KEY=');
      // Should not contain other keys
      expect(content).not.toContain('DB_HOST=');
    });

    test('syncs by tags', () => {
      const tagFile = path.join(tempDir, 'tagged.env');
      const result = runCLI(`sync -t dev --file "${tagFile}"`);
      expect(result.exitCode).toBe(0);

      const content = fs.readFileSync(tagFile, 'utf-8');
      expect(content).toContain('evk Managed Block');
    });

    test('syncs to .env with -e flag', () => {
      const envFile = path.join(tempDir, 'project.env');
      const result = runCLI(`sync -e "${envFile}"`);
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(envFile)).toBe(true);
    });

    test('requires target option', () => {
      const result = runCLI('sync');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('specify a target');
    });

    test('updates existing managed block', () => {
      const updateFile = path.join(tempDir, 'update.env');

      // First sync
      runCLI(`sync API_KEY --file "${updateFile}"`);

      // Add new variable and sync again
      runCLI('add NEW_VAR newvalue');
      runCLI(`sync API_KEY NEW_VAR --file "${updateFile}"`);

      const content = fs.readFileSync(updateFile, 'utf-8');
      expect(content).toContain('NEW_VAR=');

      // Should only have one managed block
      const blockStarts = (content.match(/=== evk Managed Block ===/g) || []).length;
      expect(blockStarts).toBe(1);
    });

    test('handles shell file format', () => {
      const shellFile = path.join(tempDir, 'test.sh');
      runCLI(`sync API_KEY --file "${shellFile}"`);

      const content = fs.readFileSync(shellFile, 'utf-8');
      // Shell format uses export
      expect(content).toContain('export API_KEY=');
    });
  });

  describe('clean command', () => {
    test('cleans managed block from file', () => {
      const cleanFile = path.join(tempDir, 'toclean.env');

      // Create file with managed block
      runCLI(`sync API_KEY --file "${cleanFile}"`);
      expect(fs.readFileSync(cleanFile, 'utf-8')).toContain('evk Managed Block');

      // Clean it
      const result = runCLI(`clean --file "${cleanFile}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Cleaned');

      // Verify block is removed
      const content = fs.readFileSync(cleanFile, 'utf-8');
      expect(content).not.toContain('evk Managed Block');
    });

    test('requires target option', () => {
      const result = runCLI('clean');
      expect(result.exitCode).not.toBe(0);
    });

    test('handles file without managed block', () => {
      const noBlockFile = path.join(tempDir, 'noblock.env');
      fs.writeFileSync(noBlockFile, 'SOME_VAR=value\n');

      const result = runCLI(`clean --file "${noBlockFile}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No managed block');
    });
  });

  describe('remove command', () => {
    test('removes variable by key', () => {
      // Add a variable to remove
      runCLI('add TO_REMOVE removevalue');
      let listResult = runCLI('list -f json');
      expect(listResult.stdout).toContain('TO_REMOVE');

      // Remove it
      const result = runCLI('remove TO_REMOVE');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Removed');

      // Verify it's gone
      listResult = runCLI('list -f json');
      expect(listResult.stdout).not.toContain('TO_REMOVE');
    });

    test('removes by key and tags', () => {
      runCLI('add TAGGED_REMOVE val1 -t tag1');
      runCLI('add TAGGED_REMOVE val2 -t tag2');

      // Remove only tag1 version
      const result = runCLI('remove TAGGED_REMOVE -t tag1');
      expect(result.exitCode).toBe(0);

      // tag2 version should still exist
      const listResult = runCLI('list -f json');
      const vars = JSON.parse(listResult.stdout);
      const remaining = vars.filter(v => v.key === 'TAGGED_REMOVE');
      expect(remaining.length).toBe(1);
      expect(remaining[0].tags).toContain('tag2');
    });

    test('removes by tags only', () => {
      runCLI('add TAG_ONLY_1 val1 -t removetag');
      runCLI('add TAG_ONLY_2 val2 -t removetag');

      const result = runCLI('remove -t removetag');
      expect(result.exitCode).toBe(0);

      const listResult = runCLI('list -f json');
      expect(listResult.stdout).not.toContain('TAG_ONLY_1');
      expect(listResult.stdout).not.toContain('TAG_ONLY_2');
    });

    test('rm alias works', () => {
      runCLI('add ALIAS_TEST aliasval');
      const result = runCLI('rm ALIAS_TEST');
      expect(result.exitCode).toBe(0);
    });

    test('warns when variable not found', () => {
      const result = runCLI('remove NON_EXISTENT_VAR');
      expect(result.stdout).toContain('not found');
    });
  });

  describe('purge command', () => {
    test('requires --force flag', () => {
      const result = runCLI('purge');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('--force');
    });

    test('purges all data with --force', () => {
      // Create a fresh store for this test
      const purgeDir = createTempDir();
      const purgeStorePath = path.join(purgeDir, 'store.yaml');

      // Initialize with some data
      runCLI('add PURGE_TEST value', { EVK_STORE_PATH: purgeStorePath });
      expect(fs.existsSync(purgeStorePath)).toBe(true);

      // Purge
      const result = runCLI('purge --force', { EVK_STORE_PATH: purgeStorePath });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Removed');

      // Verify store directory is gone
      expect(fs.existsSync(purgeStorePath)).toBe(false);

      // Clean up
      if (fs.existsSync(purgeDir)) {
        fs.rmSync(purgeDir, { recursive: true, force: true });
      }
    });
  });

  describe('Edge cases and special characters', () => {
    test('handles values with spaces', () => {
      const result = runCLI('add SPACED_VAR "value with spaces"');
      expect(result.exitCode).toBe(0);

      const getResult = runCLI('get SPACED_VAR');
      expect(getResult.stdout.trim()).toBe('value with spaces');
    });

    test('handles values with special characters', () => {
      // Avoid $$ which is interpreted as PID by shell
      const result = runCLI('add SPECIAL_VAR "p@ssw0rd!#%^&*"');
      expect(result.exitCode).toBe(0);

      const getResult = runCLI('get SPECIAL_VAR');
      expect(getResult.stdout.trim()).toBe('p@ssw0rd!#%^&*');
    });

    test('handles values with quotes', () => {
      const result = runCLI('add QUOTE_VAR \'value\\"with\\"quotes\'');
      expect(result.exitCode).toBe(0);
    });

    test('handles empty description', () => {
      const result = runCLI('add NO_DESC_VAR value123 -d ""');
      expect(result.exitCode).toBe(0);
    });

    test('handles multiple tags', () => {
      const result = runCLI('add MULTI_TAG value -t a,b,c,d,e');
      expect(result.exitCode).toBe(0);

      const showResult = runCLI('show MULTI_TAG');
      expect(showResult.stdout).toContain('a');
      expect(showResult.stdout).toContain('e');
    });
  });

  describe('import command', () => {
    test('imports from a .env file', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const sourceFile = path.join(importDir, 'source.env');
      const env = { EVK_STORE_PATH: importStore };

      // Create source file
      fs.writeFileSync(sourceFile, 'IMPORT_VAR1=value1\nIMPORT_VAR2=value2\n');

      // Import
      const result = runCLI(`import "${sourceFile}"`, env);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Imported 2');

      // Verify variables were added
      const listResult = runCLI('list -f json', env);
      const vars = JSON.parse(listResult.stdout);
      expect(vars.find(v => v.key === 'IMPORT_VAR1').value).toBe('value1');
      expect(vars.find(v => v.key === 'IMPORT_VAR2').value).toBe('value2');

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('imports from a shell file', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const sourceFile = path.join(importDir, 'source.sh');
      const env = { EVK_STORE_PATH: importStore };

      // Create shell source file
      fs.writeFileSync(sourceFile, 'export SHELL_VAR1="hello"\nexport SHELL_VAR2="world"\n');

      const result = runCLI(`import "${sourceFile}"`, env);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Imported 2');

      const listResult = runCLI('list -f json', env);
      const vars = JSON.parse(listResult.stdout);
      expect(vars.find(v => v.key === 'SHELL_VAR1').value).toBe('hello');
      expect(vars.find(v => v.key === 'SHELL_VAR2').value).toBe('world');

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('applies tags to imported variables', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const sourceFile = path.join(importDir, 'tagged.env');
      const env = { EVK_STORE_PATH: importStore };

      fs.writeFileSync(sourceFile, 'TAGGED_VAR=tagvalue\n');

      const result = runCLI(`import "${sourceFile}" -t dev,staging`, env);
      expect(result.exitCode).toBe(0);

      const listResult = runCLI('list -f json', env);
      const vars = JSON.parse(listResult.stdout);
      const imported = vars.find(v => v.key === 'TAGGED_VAR');
      expect(imported.tags).toContain('dev');
      expect(imported.tags).toContain('staging');

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('skips existing variables by default', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const sourceFile = path.join(importDir, 'conflict.env');
      const env = { EVK_STORE_PATH: importStore };

      // Add existing variable
      runCLI('add CONFLICT_VAR original_value', env);

      // Try to import same key
      fs.writeFileSync(sourceFile, 'CONFLICT_VAR=new_value\nNEW_VAR=fresh\n');
      const result = runCLI(`import "${sourceFile}"`, env);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Skipped 1');
      expect(result.stdout).toContain('CONFLICT_VAR');

      // Verify existing value unchanged
      const getResult = runCLI('get CONFLICT_VAR', env);
      expect(getResult.stdout.trim()).toBe('original_value');

      // New variable should be imported
      const getNewResult = runCLI('get NEW_VAR', env);
      expect(getNewResult.stdout.trim()).toBe('fresh');

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('--force overwrites existing variables', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const sourceFile = path.join(importDir, 'force.env');
      const env = { EVK_STORE_PATH: importStore };

      // Add existing variable
      runCLI('add FORCE_VAR original', env);

      // Force import
      fs.writeFileSync(sourceFile, 'FORCE_VAR=overwritten\n');
      const result = runCLI(`import "${sourceFile}" --force`, env);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Updated 1');

      // Verify value was overwritten
      const getResult = runCLI('get FORCE_VAR', env);
      expect(getResult.stdout.trim()).toBe('overwritten');

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('--dry-run shows preview without saving', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const sourceFile = path.join(importDir, 'dryrun.env');
      const env = { EVK_STORE_PATH: importStore };

      fs.writeFileSync(sourceFile, 'DRY_VAR=dryvalue\n');

      const result = runCLI(`import "${sourceFile}" --dry-run`, env);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Dry run');
      expect(result.stdout).toContain('DRY_VAR');

      // Verify nothing was saved
      const listResult = runCLI('list', env);
      expect(listResult.stdout).toContain('No variables found');

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('handles empty file gracefully', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const sourceFile = path.join(importDir, 'empty.env');
      const env = { EVK_STORE_PATH: importStore };

      fs.writeFileSync(sourceFile, '# Only comments\n\n');

      const result = runCLI(`import "${sourceFile}"`, env);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No variables found');

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('handles nonexistent file with error', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const env = { EVK_STORE_PATH: importStore };

      const result = runCLI(`import "/nonexistent/path/.env"`, env);
      expect(result.exitCode).not.toBe(0);

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('imports with -e shortcut flag', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const envFile = path.join(importDir, '.env');
      const env = { EVK_STORE_PATH: importStore };

      fs.writeFileSync(envFile, 'SHORTCUT_VAR=shortcut\n');

      const result = runCLI(`import -e "${envFile}"`, env);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Imported 1');

      const getResult = runCLI('get SHORTCUT_VAR', env);
      expect(getResult.stdout.trim()).toBe('shortcut');

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('treats same-value variables as unchanged', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const sourceFile = path.join(importDir, 'unchanged.env');
      const env = { EVK_STORE_PATH: importStore };

      // Add existing variable with same value
      runCLI('add SAME_VAR samevalue', env);

      // Import file with same key and same value, plus a new one
      fs.writeFileSync(sourceFile, 'SAME_VAR=samevalue\nBRAND_NEW=fresh\n');
      const result = runCLI(`import "${sourceFile}"`, env);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Imported 1');
      expect(result.stdout).toContain('1 unchanged');
      // Should NOT contain "Skipped" since it's unchanged, not a conflict
      expect(result.stdout).not.toContain('Skipped');

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('requires source argument or shortcut flag', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const env = { EVK_STORE_PATH: importStore };

      const result = runCLI('import', env);
      expect(result.exitCode).not.toBe(0);

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('no conflict when importing without tags and existing has tags', () => {
      const importDir = createTempDir();
      const importStore = path.join(importDir, 'store.yaml');
      const sourceFile = path.join(importDir, 'cross-tag.env');
      const env = { EVK_STORE_PATH: importStore };

      // Add existing variable with 'dev' tag
      runCLI('add API_KEY dev-secret -t dev', env);

      // Import same key without tags — should NOT conflict (different tag scope)
      fs.writeFileSync(sourceFile, 'API_KEY=untagged-secret\n');
      const result = runCLI(`import "${sourceFile}"`, env);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Imported 1');
      expect(result.stdout).not.toContain('Skipped');

      // Both entries should exist
      const listResult = runCLI('list -f json', env);
      const vars = JSON.parse(listResult.stdout);
      const apiKeys = vars.filter(v => v.key === 'API_KEY');
      expect(apiKeys).toHaveLength(2);
      expect(apiKeys.find(v => v.tags.includes('dev')).value).toBe('dev-secret');
      expect(apiKeys.find(v => v.tags.length === 0).value).toBe('untagged-secret');

      fs.rmSync(importDir, { recursive: true, force: true });
    });

    test('sync then import round-trip', () => {
      const rtDir = createTempDir();
      const rtStore1 = path.join(rtDir, 'store1.yaml');
      const rtStore2 = path.join(rtDir, 'store2.yaml');
      const rtFile = path.join(rtDir, 'roundtrip.env');
      const env1 = { EVK_STORE_PATH: rtStore1 };
      const env2 = { EVK_STORE_PATH: rtStore2 };

      // Add variables to store1 and sync to file
      runCLI('add RT_VAR1 rtvalue1 -t roundtrip', env1);
      runCLI('add RT_VAR2 rtvalue2 -t roundtrip', env1);
      runCLI(`sync -t roundtrip --file "${rtFile}"`, env1);

      // Import from that file into store2
      const result = runCLI(`import "${rtFile}" -t imported`, env2);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Imported 2');

      // Verify values match
      const get1 = runCLI('get RT_VAR1 -t imported', env2);
      expect(get1.stdout.trim()).toBe('rtvalue1');
      const get2 = runCLI('get RT_VAR2 -t imported', env2);
      expect(get2.stdout.trim()).toBe('rtvalue2');

      fs.rmSync(rtDir, { recursive: true, force: true });
    });
  });

  describe('Full workflow integration', () => {
    test('complete workflow: add -> list -> show -> sync -> clean -> remove', () => {
      const workflowDir = createTempDir();
      const workflowStore = path.join(workflowDir, 'store.yaml');
      const workflowTarget = path.join(workflowDir, 'workflow.env');
      const env = { EVK_STORE_PATH: workflowStore };

      // 1. Add variables
      runCLI('add WF_VAR1 value1 -t workflow -d "Workflow test var 1"', env);
      runCLI('add WF_VAR2 value2 -t workflow -d "Workflow test var 2"', env);

      // 2. List and verify
      const listResult = runCLI('list -f json', env);
      const vars = JSON.parse(listResult.stdout);
      expect(vars.length).toBe(2);

      // 3. Show details
      const showResult = runCLI('show WF_VAR1', env);
      expect(showResult.stdout).toContain('Workflow test var 1');

      // 4. Sync to file
      runCLI(`sync -t workflow --file "${workflowTarget}"`, env);
      const syncedContent = fs.readFileSync(workflowTarget, 'utf-8');
      expect(syncedContent).toContain('WF_VAR1=value1');
      expect(syncedContent).toContain('WF_VAR2=value2');

      // 5. Update a variable
      runCLI('add WF_VAR1 updated_value1 -t workflow', env);
      const getResult = runCLI('get WF_VAR1', env);
      expect(getResult.stdout.trim()).toBe('updated_value1');

      // 6. Re-sync
      runCLI(`sync -t workflow --file "${workflowTarget}"`, env);
      const updatedContent = fs.readFileSync(workflowTarget, 'utf-8');
      expect(updatedContent).toContain('WF_VAR1=updated_value1');

      // 7. Clean target file
      runCLI(`clean --file "${workflowTarget}"`, env);
      const cleanedContent = fs.readFileSync(workflowTarget, 'utf-8');
      expect(cleanedContent).not.toContain('evk Managed Block');

      // 8. Remove variables
      runCLI('remove -t workflow', env);
      const finalList = runCLI('list', env);
      expect(finalList.stdout).toContain('No variables found');

      // Clean up
      fs.rmSync(workflowDir, { recursive: true, force: true });
    });

    test('multi-environment workflow (dev/prod tags)', () => {
      const multiEnvDir = createTempDir();
      const multiEnvStore = path.join(multiEnvDir, 'store.yaml');
      const devEnvFile = path.join(multiEnvDir, 'dev.env');
      const prodEnvFile = path.join(multiEnvDir, 'prod.env');
      const env = { EVK_STORE_PATH: multiEnvStore };

      // Add dev and prod versions of same variables
      runCLI('add DATABASE_URL "postgres://localhost/dev" -t dev', env);
      runCLI('add DATABASE_URL "postgres://prod.server/prod" -t prod', env);
      runCLI('add API_KEY "dev-key-123" -t dev', env);
      runCLI('add API_KEY "prod-key-456" -t prod', env);
      runCLI('add DEBUG "true" -t dev', env);
      runCLI('add DEBUG "false" -t prod', env);

      // Verify we have 6 entries
      const listResult = runCLI('list -f json', env);
      const vars = JSON.parse(listResult.stdout);
      expect(vars.length).toBe(6);

      // Sync to dev.env
      runCLI(`sync -t dev --file "${devEnvFile}"`, env);
      const devContent = fs.readFileSync(devEnvFile, 'utf-8');
      expect(devContent).toContain('DATABASE_URL=postgres://localhost/dev');
      expect(devContent).toContain('API_KEY=dev-key-123');
      expect(devContent).toContain('DEBUG=true');

      // Sync to prod.env
      runCLI(`sync -t prod --file "${prodEnvFile}"`, env);
      const prodContent = fs.readFileSync(prodEnvFile, 'utf-8');
      expect(prodContent).toContain('DATABASE_URL=postgres://prod.server/prod');
      expect(prodContent).toContain('API_KEY=prod-key-456');
      expect(prodContent).toContain('DEBUG=false');

      // Test export with tag priority
      const exportResult = runCLI('export -t dev,prod', env);
      // prod should win (later in priority list)
      expect(exportResult.stdout).toContain('prod-key-456');
      expect(exportResult.stdout).toContain('DEBUG="false"');

      // Clean up
      fs.rmSync(multiEnvDir, { recursive: true, force: true });
    });
  });
});
