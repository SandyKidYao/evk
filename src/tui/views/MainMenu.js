import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

const { createElement: h } = React;

export default function MainMenu({ onList, onAdd, onSync, onClean, onExit }) {
  const items = [
    { label: 'List variables', value: 'list' },
    { label: 'Add variable', value: 'add' },
    { label: 'Sync to files', value: 'sync' },
    { label: 'Clean from files', value: 'clean' },
    { label: 'Exit', value: 'exit' }
  ];

  const handleSelect = (item) => {
    switch (item.value) {
      case 'list': onList(); break;
      case 'add': onAdd(); break;
      case 'sync': onSync(); break;
      case 'clean': onClean(); break;
      case 'exit': onExit(); break;
    }
  };

  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 }, h(Text, null, 'What would you like to do?')),
    h(SelectInput, { items, onSelect: handleSelect })
  );
}
