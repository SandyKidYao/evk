import chalk from 'chalk';
import { getAllTags, ensureStore } from '../core/store.js';
import * as logger from '../utils/logger.js';

export function tagsCommand(options) {
  if (ensureStore()) {
    logger.success('Initialized evk');
  }

  try {
    const tags = getAllTags();

    if (tags.length === 0) {
      logger.info('No tags found.');
      return;
    }

    const format = options.format || 'list';

    if (format === 'json') {
      console.log(JSON.stringify(tags, null, 2));
      return;
    }

    // Default: list format
    console.log('');
    console.log(chalk.bold('  Tags:'));
    console.log('');
    for (const tag of tags) {
      console.log('  ' + chalk.cyan(tag));
    }
    console.log('');
    logger.dim(`  Total: ${tags.length} tag(s)`);

  } catch (err) {
    logger.error(`Failed to list tags: ${err.message}`);
    process.exit(1);
  }
}
