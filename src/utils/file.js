import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Expand ~ to home directory
 * @param {string} filePath - Path that may contain ~
 * @returns {string} Expanded path
 */
export function expandPath(filePath) {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * Read file content safely
 * @param {string} filePath - Path to file
 * @returns {string|null} File content or null if not exists
 */
export function readFileSafe(filePath) {
  const expanded = expandPath(filePath);
  if (!fs.existsSync(expanded)) {
    return null;
  }
  return fs.readFileSync(expanded, 'utf-8');
}

/**
 * Write file with directory creation
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 */
export function writeFileSafe(filePath, content) {
  const expanded = expandPath(filePath);
  const dir = path.dirname(expanded);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(expanded, content);
}

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {boolean}
 */
export function fileExists(filePath) {
  return fs.existsSync(expandPath(filePath));
}
