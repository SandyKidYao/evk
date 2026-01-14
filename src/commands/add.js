import { addVariable, ensureStore } from '../core/store.js';
import * as logger from '../utils/logger.js';

export function addCommand(key, value, options) {
  if (ensureStore()) {
    logger.success('Initialized evk');
  }

  const tags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];

  try {
    addVariable(key, value, {
      description: options.description || '',
      tags
    });
    logger.success(`Added ${key}`);
    if (tags.length > 0) {
      logger.dim(`  Tags: ${tags.join(', ')}`);
    }
  } catch (err) {
    logger.error(`Failed to add variable: ${err.message}`);
    process.exit(1);
  }
}
