import chalk from 'chalk';
import { getVariable, ensureStore } from '../core/store.js';
import * as logger from '../utils/logger.js';

export function showCommand(key) {
  if (ensureStore()) {
    logger.success('Initialized evk');
  }

  try {
    const data = getVariable(key);

    if (!data) {
      logger.warn(`Variable ${key} not found.`);
      process.exit(1);
    }

    console.log('');
    console.log(chalk.bold(`  ${key}`));
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
    console.log('');

  } catch (err) {
    logger.error(`Failed to show variable: ${err.message}`);
    process.exit(1);
  }
}

export function getCommand(key) {
  ensureStore();

  try {
    const data = getVariable(key);

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
