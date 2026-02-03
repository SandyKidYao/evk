import { getAllVariables, getVariablesByKeys, ensureStore, flattenVariables } from '../core/store.js';

export function exportCommand(keys, options) {
  ensureStore();

  try {
    let vars;
    const filterTags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];

    if (filterTags.length > 0) {
      vars = getAllVariables({ tags: filterTags });
    } else if (keys && keys.length > 0) {
      vars = getVariablesByKeys(keys);
    } else {
      vars = getAllVariables();
    }

    if (vars.length === 0) {
      console.error('No variables found.');
      process.exit(1);
    }

    // Flatten variables - later tags in filterTags have higher priority
    const flattened = flattenVariables(vars, filterTags);

    // Output export statements for eval
    for (const [key, data] of Object.entries(flattened)) {
      const value = typeof data === 'object' ? data.value : data;
      // Escape special characters in value
      const escaped = value.replace(/"/g, '\\"');
      console.log(`export ${key}="${escaped}"`);
    }

  } catch (err) {
    console.error(`Failed to export: ${err.message}`);
    process.exit(1);
  }
}
