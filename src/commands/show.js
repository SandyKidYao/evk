import chalk from 'chalk';
import { getVariable, ensureStore } from '../core/store.js';
import * as logger from '../utils/logger.js';

export function showCommand(key, options) {
  if (ensureStore()) {
    logger.success('Initialized evk');
  }

  try {
    const filterTags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];

    let matches;
    if (filterTags.length > 0) {
      // Get exact match by key + tags
      const exact = getVariable(key, { tags: filterTags });
      matches = exact ? [exact] : [];
    } else {
      // Get all entries with matching key
      matches = getVariable(key);
    }

    if (matches.length === 0) {
      logger.warn(`Variable ${key} not found.`);
      process.exit(1);
    }

    for (const data of matches) {
      console.log('');
      console.log(chalk.bold(`  ${data.key}`));
      if (matches.length > 1 || filterTags.length > 0) {
        console.log(chalk.dim(`  ID: ${data.id.slice(0, 8)}...`));
      }
      console.log(chalk.dim('  ' + '-'.repeat(40)));
      console.log(`  Value:       ${data.value}`);
      if (data.description) {
        console.log(`  Description: ${data.description}`);
      }
      if (data.tags && data.tags.length > 0) {
        console.log(`  Tags:        ${data.tags.join(', ')}`);
      }
      if (data.created_at) {
        console.log(`  Created:     ${data.created_at}`);
      }
      if (data.updated_at) {
        console.log(`  Updated:     ${data.updated_at}`);
      }
    }
    console.log('');

  } catch (err) {
    logger.error(`Failed to show variable: ${err.message}`);
    process.exit(1);
  }
}

export function getCommand(key, options) {
  ensureStore();

  try {
    const filterTags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];

    let data;
    if (filterTags.length > 0) {
      data = getVariable(key, { tags: filterTags });
    } else {
      // Return first match for scripting compatibility
      const matches = getVariable(key);
      data = matches[0];
    }

    if (!data) {
      process.exit(1);
    }

    // Output only the value (for scripting)
    console.log(data.value);

  } catch (err) {
    console.error(`Failed to get variable: ${err.message}`);
    process.exit(1);
  }
}
