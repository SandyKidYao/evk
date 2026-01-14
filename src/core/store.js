import fs from 'fs';
import path from 'path';
import os from 'os';
import YAML from 'yaml';

const STORE_DIR = path.join(os.homedir(), '.evk');
const STORE_PATH = path.join(STORE_DIR, 'store.yaml');

/**
 * Get the store directory path
 */
export function getStoreDir() {
  return STORE_DIR;
}

/**
 * Get the store file path
 */
export function getStorePath() {
  return STORE_PATH;
}

/**
 * Check if store exists
 */
export function storeExists() {
  return fs.existsSync(STORE_PATH);
}

/**
 * Read the store file
 * @returns {object} The parsed store data
 */
export function readStore() {
  if (!storeExists()) {
    throw new Error('evk not initialized. Run `evk init` first.');
  }

  const content = fs.readFileSync(STORE_PATH, 'utf-8');
  return YAML.parse(content);
}

/**
 * Write data to the store file
 * @param {object} data - The data to write
 */
export function writeStore(data) {
  const content = YAML.stringify(data, { indent: 2 });
  fs.writeFileSync(STORE_PATH, content, { mode: 0o600 });
}

/**
 * Initialize the store with default template
 * @returns {boolean} True if created, false if already exists
 */
export function initStore() {
  if (storeExists()) {
    return false;
  }

  fs.mkdirSync(STORE_DIR, { recursive: true, mode: 0o700 });

  const template = {
    version: 1,
    encryption: 'none',
    vars: {},
    targets: {}
  };

  writeStore(template);
  return true;
}

/**
 * Ensure store exists, auto-initialize if needed
 * @returns {boolean} True if store was just initialized, false if already existed
 */
export function ensureStore() {
  if (storeExists()) {
    return false;
  }
  initStore();
  return true;
}

/**
 * Add or update a variable in the store
 * @param {string} key - Variable name
 * @param {string} value - Variable value
 * @param {object} options - Additional options (description, tags)
 */
export function addVariable(key, value, options = {}) {
  const store = readStore();
  const now = new Date().toISOString();

  const existing = store.vars[key];

  store.vars[key] = {
    value,
    description: options.description || existing?.description || '',
    tags: options.tags || existing?.tags || [],
    created_at: existing?.created_at || now,
    updated_at: now
  };

  writeStore(store);
  return store.vars[key];
}

/**
 * Remove a variable from the store
 * @param {string} key - Variable name to remove
 * @returns {boolean} True if removed, false if not found
 */
export function removeVariable(key) {
  const store = readStore();

  if (!store.vars[key]) {
    return false;
  }

  delete store.vars[key];
  writeStore(store);
  return true;
}

/**
 * Get a single variable
 * @param {string} key - Variable name
 * @returns {object|null} The variable data or null
 */
export function getVariable(key) {
  const store = readStore();
  return store.vars[key] || null;
}

/**
 * Get all variables
 * @param {object} options - Filter options
 * @returns {object} All variables (filtered if options provided)
 */
export function getAllVariables(options = {}) {
  const store = readStore();
  let vars = store.vars;

  if (options.tags && options.tags.length > 0) {
    const filterTags = options.tags;
    vars = Object.fromEntries(
      Object.entries(vars).filter(([_, v]) =>
        v.tags && v.tags.some(t => filterTags.includes(t))
      )
    );
  }

  return vars;
}

/**
 * Get variables by keys
 * @param {string[]} keys - Array of variable keys
 * @returns {object} Variables matching the keys
 */
export function getVariablesByKeys(keys) {
  const store = readStore();
  const result = {};

  for (const key of keys) {
    if (store.vars[key]) {
      result[key] = store.vars[key];
    }
  }

  return result;
}

/**
 * Remove the entire store directory
 * @returns {boolean} True if removed, false if not exists
 */
export function purgeStore() {
  if (!fs.existsSync(STORE_DIR)) {
    return false;
  }

  fs.rmSync(STORE_DIR, { recursive: true, force: true });
  return true;
}
