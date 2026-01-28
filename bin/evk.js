#!/usr/bin/env node

import { Command } from 'commander';
import { addCommand } from '../src/commands/add.js';
import { listCommand } from '../src/commands/list.js';
import { removeCommand } from '../src/commands/remove.js';
import { syncCommand } from '../src/commands/sync.js';
import { cleanCommand } from '../src/commands/clean.js';
import { exportCommand } from '../src/commands/export.js';
import { showCommand, getCommand } from '../src/commands/show.js';
import { purgeCommand } from '../src/commands/purge.js';
import { tagsCommand } from '../src/commands/tags.js';
import { startTUI } from '../src/tui/index.js';

const program = new Command();

program
  .name('evk')
  .description('A local-first environment variable keeper for developers')
  .version('0.1.0')
  .action(() => {
    // Default action: start interactive TUI
    startTUI();
  });

// add command
program
  .command('add <key> <value>')
  .description('Add or update an environment variable')
  .option('-d, --description <desc>', 'Variable description')
  .option('-t, --tags <tags>', 'Tags (comma-separated)')
  .action(addCommand);

// list command
program
  .command('list')
  .alias('ls')
  .description('List all environment variables')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('-f, --format <format>', 'Output format (table|json|yaml)', 'table')
  .action(listCommand);

// remove command
program
  .command('remove [key]')
  .alias('rm')
  .description('Remove an environment variable')
  .option('-t, --tags <tags>', 'Remove all variables with tags (comma-separated)')
  .action(removeCommand);

// sync command
program
  .command('sync [keys...]')
  .description('Sync variables to target files')
  .option('-z, --zsh', 'Sync to ~/.zshrc')
  .option('-b, --bash', 'Sync to ~/.bashrc')
  .option('--fish', 'Sync to ~/.config/fish/config.fish')
  .option('-e, --env [path]', 'Sync to .env file (default: ./.env)')
  .option('--file <path>', 'Sync to custom file path')
  .option('-t, --tags <tags>', 'Sync variables with tags (comma-separated)')
  .action(syncCommand);

// clean command
program
  .command('clean')
  .description('Remove evk managed block from target files')
  .option('-z, --zsh', 'Clean ~/.zshrc')
  .option('-b, --bash', 'Clean ~/.bashrc')
  .option('--fish', 'Clean ~/.config/fish/config.fish')
  .option('-e, --env [path]', 'Clean .env file')
  .option('--file <path>', 'Clean custom file path')
  .option('--all', 'Clean all known targets')
  .action(cleanCommand);

// export command
program
  .command('export [keys...]')
  .description('Export variables for eval (use with: eval $(evk export ...))')
  .option('-t, --tags <tags>', 'Export by tags (comma-separated)')
  .action(exportCommand);

// show command
program
  .command('show <key>')
  .description('Show detailed information about a variable')
  .action(showCommand);

// get command
program
  .command('get <key>')
  .description('Get the value of a variable (for scripting)')
  .action(getCommand);

// tags command
program
  .command('tags')
  .description('List all available tags')
  .option('-f, --format <format>', 'Output format (list|json)', 'list')
  .action(tagsCommand);

// ui command (explicit)
program
  .command('ui')
  .description('Start interactive TUI mode')
  .action(startTUI);

// purge command
program
  .command('purge')
  .description('Delete all evk data (~/.evk directory)')
  .option('-f, --force', 'Confirm deletion without prompting')
  .action(purgeCommand);

program.parse();
