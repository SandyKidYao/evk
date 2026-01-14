import chalk from 'chalk';
import { getAllVariables, ensureStore } from '../core/store.js';
import * as logger from '../utils/logger.js';

export function listCommand(options) {
  if (ensureStore()) {
    logger.success('Initialized evk');
  }

  try {
    const tags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];
    const vars = getAllVariables({ tags: tags.length > 0 ? tags : undefined });
    const entries = Object.entries(vars);

    if (entries.length === 0) {
      logger.info('No variables found.');
      return;
    }

    const format = options.format || 'table';

    if (format === 'json') {
      console.log(JSON.stringify(vars, null, 2));
      return;
    }

    if (format === 'yaml') {
      for (const [key, data] of entries) {
        console.log(`${key}:`);
        console.log(`  value: ${data.value}`);
        if (data.description) console.log(`  description: ${data.description}`);
        if (data.tags?.length > 0) console.log(`  tags: [${data.tags.join(', ')}]`);
      }
      return;
    }

    // Default: table format
    console.log('');
    console.log(chalk.bold('  KEY'.padEnd(30) + 'VALUE'.padEnd(40) + 'TAGS'));
    console.log(chalk.dim('  ' + '-'.repeat(80)));

    for (const [key, data] of entries) {
      const value = data.value.length > 35
        ? data.value.slice(0, 32) + '...'
        : data.value;
      const tags = data.tags?.join(', ') || '';

      console.log(
        '  ' +
        chalk.cyan(key.padEnd(30)) +
        value.padEnd(40) +
        chalk.dim(tags)
      );
    }
    console.log('');
    logger.dim(`  Total: ${entries.length} variable(s)`);

  } catch (err) {
    logger.error(`Failed to list variables: ${err.message}`);
    process.exit(1);
  }
}
