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

    if (vars.length === 0) {
      logger.info('No variables found.');
      return;
    }

    const format = options.format || 'table';

    if (format === 'json') {
      console.log(JSON.stringify(vars, null, 2));
      return;
    }

    if (format === 'yaml') {
      for (const entry of vars) {
        console.log(`${entry.key}:`);
        console.log(`  value: ${entry.value}`);
        if (entry.description) console.log(`  description: ${entry.description}`);
        if (entry.tags?.length > 0) console.log(`  tags: [${entry.tags.join(', ')}]`);
      }
      return;
    }

    // Default: table format
    console.log('');
    console.log(chalk.bold('  KEY'.padEnd(30) + 'VALUE'.padEnd(40) + 'TAGS'));
    console.log(chalk.dim('  ' + '-'.repeat(80)));

    for (const entry of vars) {
      const value = entry.value.length > 35
        ? entry.value.slice(0, 32) + '...'
        : entry.value;
      const tags = entry.tags?.join(', ') || '';

      console.log(
        '  ' +
        chalk.cyan(entry.key.padEnd(30)) +
        value.padEnd(40) +
        chalk.dim(tags)
      );
    }
    console.log('');
    logger.dim(`  Total: ${vars.length} variable(s)`);

  } catch (err) {
    logger.error(`Failed to list variables: ${err.message}`);
    process.exit(1);
  }
}
