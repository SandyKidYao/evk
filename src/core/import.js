import { readFileSafe, expandPath } from '../utils/file.js';
import { detectTargetType } from '../utils/parser.js';
import { addVariable, getVariable, ensureStore } from './store.js';

/**
 * Parse environment variables from a file
 * Supports shell format (export KEY="value") and dotenv format (KEY=value)
 * @param {string} filePath - Path to source file
 * @returns {{ vars: object, type: string, error?: string }} Parsed variables
 */
export function parseVariablesFromFile(filePath) {
  const resolved = expandPath(filePath);
  const content = readFileSafe(resolved);

  if (content === null) {
    return { vars: {}, type: 'dotenv', error: `File not found: ${filePath}` };
  }

  const type = detectTargetType(resolved);
  const vars = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    let match;
    if (type === 'shell') {
      // export KEY="value" or export KEY='value' or export KEY=value
      match = trimmed.match(/^export\s+([A-Za-z_][A-Za-z0-9_]*)=["']?(.*)["']?$/);
    } else {
      // KEY=value or KEY="value" or KEY='value'
      match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=["']?(.*)["']?$/);
    }

    if (match) {
      const [, key, value] = match;
      // Remove trailing quote if present
      vars[key] = value.replace(/["']$/, '');
    }
  }

  return { vars, type };
}

/**
 * Detect conflicts between parsed variables and existing store
 * Variables with identical values are treated as unchanged (not conflicts)
 * @param {object} parsedVars - Parsed variables { KEY: value }
 * @param {string[]} tags - Tags to apply
 * @returns {{ toImport: Array, conflicts: Array, unchanged: Array }}
 */
export function detectConflicts(parsedVars, tags = []) {
  const toImport = [];
  const conflicts = [];
  const unchanged = [];

  for (const [key, value] of Object.entries(parsedVars)) {
    // Always use exact tag matching (key + tags)
    // When tags=[], only matches entries with empty tags
    const existing = getVariable(key, { tags });

    if (existing !== null) {
      // If value is identical, treat as unchanged (skip silently)
      if (existing.value === value) {
        unchanged.push({ key, value, existing });
      } else {
        conflicts.push({ key, value, existing });
      }
    } else {
      toImport.push({ key, value });
    }
  }

  return { toImport, conflicts, unchanged };
}

/**
 * Execute the import of variables into the store
 * @param {Array} variables - Variables to import [{ key, value }]
 * @param {object} options - Import options
 * @param {string[]} options.tags - Tags to apply
 * @param {string} options.description - Description for imported variables
 * @returns {{ imported: number }}
 */
export function executeImport(variables, options = {}) {
  const tags = options.tags || [];
  const description = options.description || '';

  let imported = 0;

  for (const { key, value } of variables) {
    addVariable(key, value, { tags, description });
    imported++;
  }

  return { imported };
}
