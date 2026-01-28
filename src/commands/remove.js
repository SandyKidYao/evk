import { removeVariable, ensureStore, getVariable, getAllVariables } from '../core/store.js';
import * as logger from '../utils/logger.js';

export function removeCommand(key, options) {
  if (ensureStore()) {
    logger.success('Initialized evk');
  }

  try {
    const filterTags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];

    // Remove by tags
    if (filterTags.length > 0) {
      const vars = getAllVariables({ tags: filterTags });
      const keys = Object.keys(vars);

      if (keys.length === 0) {
        logger.warn(`No variables found with tags: ${filterTags.join(', ')}`);
        return;
      }

      for (const k of keys) {
        removeVariable(k);
      }
      logger.success(`Removed ${keys.length} variable(s): ${keys.join(', ')}`);
      return;
    }

    // Remove by key
    if (!key) {
      logger.error('Please specify a key or use --tags to filter');
      process.exit(1);
    }

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
