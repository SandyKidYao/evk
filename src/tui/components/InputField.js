import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { colors, icons } from '../theme.js';

const { createElement: h } = React;

const LABEL_WIDTH = 16;

// Step-form input row: label column + bordered text input that
// fills the remaining form width
export default function InputField({ label, fieldValue, isActive, onChange, onSubmit }) {
  return h(Box, { marginBottom: 1 },
    h(Box, { width: LABEL_WIDTH },
      h(Text, { color: isActive ? colors.accent : colors.textDim, bold: isActive },
        `${isActive ? icons.arrow : ' '} ${label}: `
      )
    ),
    isActive
      ? h(Box, {
          borderStyle: 'round',
          borderColor: colors.accent,
          paddingX: 1,
          flexGrow: 1
        },
          h(TextInput, {
            value: fieldValue,
            onChange,
            onSubmit
          })
        )
      : h(Text, { color: fieldValue ? colors.text : colors.textMuted },
          fieldValue || '(empty)'
        )
  );
}
