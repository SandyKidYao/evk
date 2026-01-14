import { getAllVariables, getVariablesByKeys, ensureStore } from '../core/store.js';

export function exportCommand(keys, options) {
  ensureStore();

  try {
    let vars;

    if (options.tags) {
      const tags = options.tags.split(',').map(t => t.trim());
      vars = getAllVariables({ tags });
    } else if (keys && keys.length > 0) {
      vars = getVariablesByKeys(keys);
    } else {
      vars = getAllVariables();
    }

    if (Object.keys(vars).length === 0) {
      console.error('No variables found.');
      process.exit(1);
    }

    // Output export statements for eval
    for (const [key, data] of Object.entries(vars)) {
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
