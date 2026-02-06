import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { colors, icons } from '../theme.js';

const { createElement: h } = React;

export default function MainMenu({ onList, onAdd, onSync, onImport, onClean, onExit }) {
  const items = [
    { label: `${icons.list}  List variables`, value: 'list' },
    { label: `${icons.add}  Add variable`, value: 'add' },
    { label: `${icons.import}  Import from file`, value: 'import' },
    { label: `${icons.sync}  Sync to files`, value: 'sync' },
    { label: `${icons.clean}  Clean from files`, value: 'clean' },
    { label: `${icons.exit}  Exit`, value: 'exit' }
  ];

  const handleSelect = (item) => {
    switch (item.value) {
      case 'list': onList(); break;
      case 'add': onAdd(); break;
      case 'import': onImport(); break;
      case 'sync': onSync(); break;
      case 'clean': onClean(); break;
      case 'exit': onExit(); break;
    }
  };

  const indicatorComponent = ({ isSelected }) =>
    h(Text, { color: isSelected ? colors.accent : colors.textDim },
      isSelected ? `${icons.arrow} ` : '  '
    );

  const itemComponent = ({ isSelected, label }) =>
    h(Text, {
      color: isSelected ? colors.primaryLight : colors.text,
      bold: isSelected
    }, label);

  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 },
      h(Text, { color: colors.textDim }, 'What would you like to do?')
    ),
    h(Box, {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: colors.border,
      paddingX: 2,
      paddingY: 1
    },
      h(SelectInput, {
        items,
        onSelect: handleSelect,
        indicatorComponent,
        itemComponent
      })
    )
  );
}
