import { removeVariable, ensureStore, getVariable, getAllVariables } from '../core/store.js';
import * as logger from '../utils/logger.js';

export function removeCommand(key, options) {
  if (ensureStore()) {
    logger.success('Initialized evk');
  }

  try {
    const filterTags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];

    // Remove by tags only (no key specified)
    if (!key && filterTags.length > 0) {
      const vars = getAllVariables({ tags: filterTags });

      if (vars.length === 0) {
        logger.warn(`No variables found with tags: ${filterTags.join(', ')}`);
        return;
      }

      for (const v of vars) {
        removeVariable(v.id, { byId: true });
      }
      logger.success(`Removed ${vars.length} variable(s)`);
      return;
    }

    // Remove by key
    if (!key) {
      logger.error('Please specify a key or use --tags to filter');
      process.exit(1);
    }

    // If tags specified with key, remove exact match
    if (filterTags.length > 0) {
      const count = removeVariable(key, { tags: filterTags });
      if (count === 0) {
        logger.warn(`Variable ${key} with tags [${filterTags.join(', ')}] not found.`);
        return;
      }
      logger.success(`Removed ${key} [${filterTags.join(', ')}]`);
      return;
    }

    // Remove all entries with matching key
    const matches = getVariable(key);
    if (matches.length === 0) {
      logger.warn(`Variable ${key} not found.`);
      return;
    }

    if (matches.length > 1) {
      logger.info(`Found ${matches.length} entries for ${key}:`);
      for (const m of matches) {
        logger.dim(`  - [${m.tags.join(', ') || 'no tags'}]: ${m.value.slice(0, 30)}${m.value.length > 30 ? '...' : ''}`);
      }
    }

    const count = removeVariable(key);
    logger.success(`Removed ${count} entry/entries for ${key}`);
  } catch (err) {
    logger.error(`Failed to remove variable: ${err.message}`);
    process.exit(1);
  }
}
