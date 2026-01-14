import { purgeStore, storeExists, getStoreDir } from '../core/store.js';
import * as logger from '../utils/logger.js';

export function purgeCommand(options) {
  if (!storeExists()) {
    logger.warn('evk is not initialized. Nothing to purge.');
    return;
  }

  if (!options.force) {
    logger.error('This will delete all stored variables permanently.');
    logger.error('Run with --force to confirm: evk purge --force');
    process.exit(1);
  }

  try {
    const storeDir = getStoreDir();
    const removed = purgeStore();

    if (removed) {
      logger.success(`Removed ${storeDir}`);
      logger.dim('All evk data has been deleted.');
    } else {
      logger.warn('Nothing to remove.');
    }
  } catch (err) {
    logger.error(`Failed to purge: ${err.message}`);
    process.exit(1);
  }
}
