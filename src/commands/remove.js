import { removeVariable, ensureStore, getVariable } from '../core/store.js';
import * as logger from '../utils/logger.js';

export function removeCommand(key) {
  if (ensureStore()) {
    logger.success('Initialized evk');
  }

  try {
    if (!getVariable(key)) {
      logger.warn(`Variable ${key} not found.`);
      return;
    }

    removeVariable(key);
    logger.success(`Removed ${key}`);
  } catch (err) {
    logger.error(`Failed to remove variable: ${err.message}`);
    process.exit(1);
  }
}
