import fs from 'fs';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import { v4 as uuidv4 } from 'uuid';

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
 * Normalize tags array - sort and deduplicate
 * @param {string[]} tags
 * @returns {string[]}
 */
function normalizeTags(tags) {
  return [...new Set(tags || [])].sort();
}

/**
 * Check if two tags arrays are equal (must be normalized first)
 * @param {string[]} tags1
 * @param {string[]} tags2
 * @returns {boolean}
 */
function tagsEqual(tags1, tags2) {
  const t1 = normalizeTags(tags1);
  const t2 = normalizeTags(tags2);
  return t1.length === t2.length && t1.every((t, i) => t === t2[i]);
}

/**
 * Find exact match by key + tags
 * @param {Array} vars - Variables array
 * @param {string} key - Variable key
 * @param {string[]} tags - Tags array
 * @returns {object|undefined}
 */
function findExactMatch(vars, key, tags) {
  return vars.find(v => v.key === key && tagsEqual(v.tags, tags));
}

/**
 * Migrate v1 store format to v2 (array-based)
 * @returns {boolean} True if migration was performed
 */
export function migrateStoreIfNeeded() {
  if (!storeExists()) return false;

  const store = readStore();

  // Already v2 or array-based
  if (store.version === 2 || Array.isArray(store.vars)) {
    return false;
  }

  // Migrate v1 -> v2
  const newVars = [];

  for (const [key, data] of Object.entries(store.vars || {})) {
    newVars.push({
      id: uuidv4(),
      key,
      value: data.value,
      tags: data.tags || [],
      description: data.description || '',
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString()
    });
  }

  const newStore = {
    version: 2,
    encryption: store.encryption || 'none',
    vars: newVars,
    targets: store.targets || {}
  };

  writeStore(newStore);
  return true;
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
    version: 2,
    encryption: 'none',
    vars: [],
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
    migrateStoreIfNeeded();
    return false;
  }
  initStore();
  return true;
}

/**
 * Add or update a variable in the store
 * If key + tags (sorted) match exactly, update; otherwise create new entry
 * @param {string} key - Variable name
 * @param {string} value - Variable value
 * @param {object} options - Additional options (description, tags)
 * @returns {object} The added/updated variable entry
 */
export function addVariable(key, value, options = {}) {
  const store = readStore();
  const now = new Date().toISOString();
  const tags = normalizeTags(options.tags);

  // Find exact match by key + tags
  const existing = findExactMatch(store.vars, key, tags);

  if (existing) {
    // Update existing entry
    existing.value = value;
    existing.description = options.description ?? existing.description;
    existing.updated_at = now;
    writeStore(store);
    return existing;
  } else {
    // Create new entry
    const newEntry = {
      id: uuidv4(),
      key,
      value,
      tags,
      description: options.description || '',
      created_at: now,
      updated_at: now
    };
    store.vars.push(newEntry);
    writeStore(store);
    return newEntry;
  }
}

/**
 * Remove variable(s) from the store
 * @param {string} idOrKey - Variable ID or key
 * @param {object} options - Options: { byId: true } to delete by ID, { tags: [...] } to delete by key+tags
 * @returns {number} Number of entries removed
 */
export function removeVariable(idOrKey, options = {}) {
  const store = readStore();
  const initialLength = store.vars.length;

  if (options.byId) {
    // Delete by ID
    store.vars = store.vars.filter(v => v.id !== idOrKey);
  } else if (options.tags) {
    // Delete by key + tags exact match
    const tags = normalizeTags(options.tags);
    store.vars = store.vars.filter(v =>
      !(v.key === idOrKey && tagsEqual(v.tags, tags))
    );
  } else {
    // Delete all entries with matching key
    store.vars = store.vars.filter(v => v.key !== idOrKey);
  }

  const removedCount = initialLength - store.vars.length;
  if (removedCount > 0) {
    writeStore(store);
  }
  return removedCount;
}

/**
 * Get variable by ID
 * @param {string} id - Variable UUID
 * @returns {object|null} The variable entry or null
 */
export function getVariableById(id) {
  const store = readStore();
  return store.vars.find(v => v.id === id) || null;
}

/**
 * Get variable(s) by key
 * @param {string} key - Variable name
 * @param {object} options - Options: { tags: [...] } for exact match
 * @returns {Array|object|null} Array of matches, or single entry if tags specified
 */
export function getVariable(key, options = {}) {
  const store = readStore();

  if (options.tags) {
    // Return exact match by key + tags
    const tags = normalizeTags(options.tags);
    return findExactMatch(store.vars, key, tags) || null;
  }

  // Return all entries with matching key
  return store.vars.filter(v => v.key === key);
}

/**
 * Get all variables
 * @param {object} options - Filter options: { tags: [...] } to filter by tags
 * @returns {Array} Array of variable entries
 */
export function getAllVariables(options = {}) {
  const store = readStore();
  let vars = store.vars;

  if (options.tags && options.tags.length > 0) {
    const filterTags = options.tags;
    vars = vars.filter(v =>
      v.tags && v.tags.some(t => filterTags.includes(t))
    );
  }

  return vars;
}

/**
 * Get all unique tags from all variables
 * @returns {string[]} Sorted array of unique tags
 */
export function getAllTags() {
  const store = readStore();
  const tagSet = new Set();

  for (const entry of store.vars) {
    if (entry.tags && Array.isArray(entry.tags)) {
      for (const tag of entry.tags) {
        tagSet.add(tag);
      }
    }
  }

  return Array.from(tagSet).sort();
}

/**
 * Get variables by keys
 * @param {string[]} keys - Array of variable keys
 * @returns {Array} Array of matching variable entries
 */
export function getVariablesByKeys(keys) {
  const store = readStore();
  return store.vars.filter(v => keys.includes(v.key));
}

/**
 * Flatten variables array to object for sync/export
 * Handles same-key conflicts by tag priority (later tags override earlier)
 * @param {Array} vars - Variables array
 * @param {string[]} tagPriority - Tag priority order (later = higher priority)
 * @returns {object} Flattened variables { key: { value, ... } }
 */
export function flattenVariables(vars, tagPriority = []) {
  const result = {};

  // Sort by tag priority (higher priority = later in iteration = overwrites)
  const sorted = [...vars].sort((a, b) => {
    const aMaxPriority = Math.max(-1, ...a.tags.map(t => tagPriority.indexOf(t)));
    const bMaxPriority = Math.max(-1, ...b.tags.map(t => tagPriority.indexOf(t)));
    return aMaxPriority - bMaxPriority;
  });

  for (const v of sorted) {
    result[v.key] = {
      value: v.value,
      description: v.description,
      tags: v.tags,
      id: v.id
    };
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
