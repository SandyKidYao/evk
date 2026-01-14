import path from 'path';
import os from 'os';
import { cleanFile, hasManagedBlock } from '../core/sync.js';
import { expandPath } from '../utils/file.js';
import * as logger from '../utils/logger.js';

// Predefined target paths
const TARGETS = {
  zsh: path.join(os.homedir(), '.zshrc'),
  bash: path.join(os.homedir(), '.bashrc'),
  fish: path.join(os.homedir(), '.config', 'fish', 'config.fish')
};

export function cleanCommand(options) {
  try {
    const targets = [];

    if (options.all) {
      // Clean all known targets
      targets.push(TARGETS.zsh, TARGETS.bash);
      if (options.env) {
        const envPath = typeof options.env === 'string' ? options.env : '.env';
        targets.push(path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath));
      }
    } else {
      if (options.zsh || options.z) {
        targets.push(TARGETS.zsh);
      }
      if (options.bash || options.b) {
        targets.push(TARGETS.bash);
      }
      if (options.fish) {
        targets.push(TARGETS.fish);
      }
      if (options.env || options.e) {
        const envPath = typeof options.env === 'string' ? options.env : '.env';
        targets.push(path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath));
      }
      if (options.file) {
        targets.push(expandPath(options.file));
      }
    }

    if (targets.length === 0) {
      logger.error('Please specify a target: --zsh, --bash, --env, --file <path>, or --all');
      process.exit(1);
    }

    let cleaned = 0;
    let totalRestored = [];

    for (const target of targets) {
      const result = cleanFile(target);

      if (result.cleaned || result.restored.length > 0) {
        logger.success(`Cleaned ${target}`);
        if (result.restored.length > 0) {
          logger.info(`  Restored ${result.restored.length} variable(s): ${result.restored.join(', ')}`);
          totalRestored.push(...result.restored);
        }
        cleaned++;
      } else {
        logger.dim(`  No managed block in ${target}`);
      }
    }

    if (cleaned === 0) {
      logger.info('No managed blocks found to clean.');
    }

  } catch (err) {
    logger.error(`Failed to clean: ${err.message}`);
    process.exit(1);
  }
}
