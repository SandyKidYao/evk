import path from 'path';
import os from 'os';
import { getAllVariables, getVariablesByKeys, ensureStore } from '../core/store.js';
import { syncToFile } from '../core/sync.js';
import { expandPath } from '../utils/file.js';
import * as logger from '../utils/logger.js';

// Predefined target paths
const TARGETS = {
  zsh: path.join(os.homedir(), '.zshrc'),
  bash: path.join(os.homedir(), '.bashrc'),
  fish: path.join(os.homedir(), '.config', 'fish', 'config.fish')
};

export function syncCommand(keys, options) {
  if (ensureStore()) {
    logger.success('Initialized evk');
  }

  try {
    // Determine target path
    let targetPath;

    if (options.zsh || options.z) {
      targetPath = TARGETS.zsh;
    } else if (options.bash || options.b) {
      targetPath = TARGETS.bash;
    } else if (options.fish) {
      targetPath = TARGETS.fish;
    } else if (options.env || options.e) {
      // .env file - default to current directory or specified path
      const envPath = typeof options.env === 'string' ? options.env : '.env';
      targetPath = path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
    } else if (options.file) {
      targetPath = expandPath(options.file);
    } else {
      logger.error('Please specify a target: --zsh, --bash, --env, or --file <path>');
      process.exit(1);
    }

    // Get variables to sync
    let vars;
    const filterTags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];

    if (keys && keys.length > 0) {
      vars = getVariablesByKeys(keys);
      if (Object.keys(vars).length === 0) {
        logger.warn('None of the specified keys were found.');
        return;
      }
    } else if (filterTags.length > 0) {
      vars = getAllVariables({ tags: filterTags });
      if (Object.keys(vars).length === 0) {
        logger.warn(`No variables found with tags: ${filterTags.join(', ')}`);
        return;
      }
    } else {
      vars = getAllVariables();
      if (Object.keys(vars).length === 0) {
        logger.warn('No variables to sync. Add some with: evk add <KEY> <VALUE>');
        return;
      }
    }

    // Perform sync
    const result = syncToFile(targetPath, vars);

    logger.success(`Synced to ${result.path}`);
    logger.dim(`  ${result.total} variable(s): ${result.added} added, ${result.updated} updated, ${result.deprecated} deprecated`);

    // Warn about commented conflicts
    if (result.commented && result.commented.length > 0) {
      logger.warn(`  Commented out ${result.commented.length} conflicting variable(s): ${result.commented.join(', ')}`);
    }

  } catch (err) {
    logger.error(`Failed to sync: ${err.message}`);
    process.exit(1);
  }
}
