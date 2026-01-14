import chalk from 'chalk';

export function success(message) {
  console.log(chalk.green('✓'), message);
}

export function error(message) {
  console.error(chalk.red('✗'), message);
}

export function warn(message) {
  console.log(chalk.yellow('!'), message);
}

export function info(message) {
  console.log(chalk.blue('i'), message);
}

export function log(message) {
  console.log(message);
}

export function dim(message) {
  console.log(chalk.dim(message));
}
