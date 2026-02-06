import path from 'path';
import os from 'os';
import { ensureStore } from '../core/store.js';
import { parseVariablesFromFile, detectConflicts, executeImport } from '../core/import.js';
import { expandPath } from '../utils/file.js';
import * as logger from '../utils/logger.js';

// Predefined source paths
const SOURCES = {
  zsh: path.join(os.homedir(), '.zshrc'),
  bash: path.join(os.homedir(), '.bashrc')
};

export function importCommand(source, options) {
  if (ensureStore()) {
    logger.success('Initialized evk');
  }

  const tags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];
  const force = options.force || false;
  const dryRun = options.dryRun || false;

  // Determine source path from shortcut flags or positional argument
  let sourcePath;

  if (options.zsh || options.z) {
    sourcePath = SOURCES.zsh;
  } else if (options.bash || options.b) {
    sourcePath = SOURCES.bash;
  } else if (options.env !== undefined || options.e !== undefined) {
    const envPath = typeof options.env === 'string' ? options.env : '.env';
    sourcePath = path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
  } else if (source) {
    sourcePath = expandPath(source);
  } else {
    logger.error('Please specify a source: --zsh, --bash, --env, or provide a file path');
    process.exit(1);
  }

  // Parse source file
  const resolved = expandPath(sourcePath);
  const { vars, type, error } = parseVariablesFromFile(resolved);

  if (error) {
    logger.error(error);
    process.exit(1);
  }

  const keys = Object.keys(vars);
  if (keys.length === 0) {
    logger.warn('No variables found in file');
    return;
  }

  logger.info(`Found ${keys.length} variable(s) in ${sourcePath} (${type} format)`);

  // Detect conflicts
  const { toImport, conflicts, unchanged } = detectConflicts(vars, tags);

  // Dry run mode
  if (dryRun) {
    if (toImport.length > 0) {
      logger.log('');
      logger.success('Variables to import:');
      for (const { key, value } of toImport) {
        logger.log(`  ${key}=${value.length > 40 ? value.slice(0, 37) + '...' : value}`);
      }
    }

    if (conflicts.length > 0) {
      logger.log('');
      if (force) {
        logger.warn('Variables to overwrite (--force):');
      } else {
        logger.warn('Variables to skip (conflicts):');
      }
      for (const { key, value, existing } of conflicts) {
        logger.log(`  ${key}`);
        logger.dim(`    current: ${existing.value}`);
        logger.dim(`    new:     ${value}`);
      }
    }

    if (unchanged.length > 0) {
      logger.log('');
      logger.dim('Unchanged (same value):');
      for (const { key } of unchanged) {
        logger.dim(`  ${key}`);
      }
    }

    logger.log('');
    logger.dim('Dry run — no changes made');
    return;
  }

  // Import new variables
  let imported = 0;
  let updated = 0;

  if (toImport.length > 0) {
    const result = executeImport(toImport, { tags });
    imported = result.imported;
  }

  // Handle conflicts
  if (force && conflicts.length > 0) {
    const conflictVars = conflicts.map(c => ({ key: c.key, value: c.value }));
    const result = executeImport(conflictVars, { tags });
    updated = result.imported;
  }

  // Report results
  if (imported > 0) {
    logger.success(`Imported ${imported} variable(s)`);
  }
  if (updated > 0) {
    logger.success(`Updated ${updated} existing variable(s)`);
  }
  if (tags.length > 0) {
    logger.dim(`  Tags: ${tags.join(', ')}`);
  }
  if (unchanged.length > 0) {
    logger.dim(`  ${unchanged.length} unchanged (same value)`);
  }

  // Report skipped conflicts
  if (!force && conflicts.length > 0) {
    logger.warn(`Skipped ${conflicts.length} variable(s) due to conflicts:`);
    for (const { key } of conflicts) {
      logger.dim(`  ${key} (already exists with different value)`);
    }
    logger.dim('  Use --force to overwrite');
  }
}
