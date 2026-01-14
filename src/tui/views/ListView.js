import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { getAllVariables } from '../../core/store.js';

const { createElement: h } = React;

export default function ListView({ onBack, onSelect, onAdd, showMessage }) {
  const [vars, setVars] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const data = getAllVariables();
      setVars(data);
    } catch (err) {
      showMessage(err.message, 'error');
    }
    setLoading(false);
  }, []);

  useInput((input, key) => {
    if (key.escape) onBack();
    if (input === 'a') onAdd();
  });

  if (loading) return h(Text, null, 'Loading...');

  const entries = Object.entries(vars);

  if (entries.length === 0) {
    return h(Box, { flexDirection: 'column' },
      h(Text, { color: 'yellow' }, 'No variables found.'),
      h(Box, { marginTop: 1 },
        h(Text, { color: 'gray' }, 'Press '),
        h(Text, { color: 'cyan' }, 'a'),
        h(Text, { color: 'gray' }, ' to add, '),
        h(Text, { color: 'cyan' }, 'Esc'),
        h(Text, { color: 'gray' }, ' to go back')
      )
    );
  }

  const items = entries.map(([key, data]) => ({
    label: `${key.padEnd(25)} ${data.value.slice(0, 30)}${data.value.length > 30 ? '...' : ''}`,
    value: key
  }));

  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 },
      h(Text, { bold: true }, `Variables (${entries.length})`),
      h(Text, { color: 'gray' }, '  •  Press '),
      h(Text, { color: 'cyan' }, 'a'),
      h(Text, { color: 'gray' }, ' to add')
    ),
    h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor: 'gray', paddingX: 1 },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: 'gray' }, 'KEY'.padEnd(25) + ' VALUE')
      ),
      h(SelectInput, { items, onSelect: (item) => onSelect(item.value) })
    )
  );
}
