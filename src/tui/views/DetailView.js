import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { getVariable, removeVariable, addVariable } from '../../core/store.js';
import { colors, icons, getTagColor } from '../theme.js';

const { createElement: h } = React;

// Info row component
function InfoRow({ icon, label, value, valueColor }) {
  return h(Box, { marginBottom: 0 },
    h(Box, { width: 14 },
      h(Text, { color: colors.textDim }, `${icon} `),
      h(Text, { color: colors.textMuted, bold: true }, label)
    ),
    h(Text, { color: valueColor || colors.text }, value || '(empty)')
  );
}

// Tag badges
function TagBadges({ tags }) {
  if (!tags || tags.length === 0) return h(Text, { color: colors.textMuted }, '(none)');
  return h(Box, null,
    ...tags.map((tag, i) =>
      h(Text, { key: i, color: getTagColor(tag) }, `${tag}${i < tags.length - 1 ? '  ' : ''}`)
    )
  );
}

export default function DetailView({ varKey, onBack, showMessage, setFooterHints }) {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState('view'); // view, edit, confirmDelete
  const [editValue, setEditValue] = useState('');

  // Update footer hints - DetailView has no special shortcuts
  useEffect(() => {
    setFooterHints([]);
  }, [setFooterHints]);

  useEffect(() => {
    const varData = getVariable(varKey);
    setData(varData);
    if (varData) {
      setEditValue(varData.value);
    }
  }, [varKey]);

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'view') {
        onBack();
      } else {
        setMode('view');
        if (data) setEditValue(data.value);
      }
    }
  });

  const handleAction = (item) => {
    switch (item.value) {
      case 'edit':
        setMode('edit');
        break;
      case 'delete':
        setMode('confirmDelete');
        break;
      case 'back':
        onBack();
        break;
    }
  };

  const handleEditSubmit = () => {
    try {
      addVariable(varKey, editValue, {
        description: data.description,
        tags: data.tags
      });
      setData({ ...data, value: editValue });
      showMessage(`Updated ${varKey}`);
      setMode('view');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const handleDeleteConfirm = (item) => {
    if (item.value === 'yes') {
      try {
        removeVariable(varKey);
        showMessage(`Removed ${varKey}`);
        onBack();
      } catch (err) {
        showMessage(err.message, 'error');
      }
    } else {
      setMode('view');
    }
  };

  if (!data) {
    return h(Box, { padding: 1 },
      h(Text, { color: colors.error }, `${icons.error} Variable not found`)
    );
  }

  // Display value directly
  const displayValue = data.value;

  // Confirm delete mode
  if (mode === 'confirmDelete') {
    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { color: colors.error, bold: true }, `${icons.delete} Delete "${varKey}"?`)
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.error,
        paddingX: 2,
        paddingY: 1
      },
        h(Text, { color: colors.textDim, marginBottom: 1 },
          'This action cannot be undone.'
        ),
        h(SelectInput, {
          items: [
            { label: `${icons.back} No, cancel`, value: 'no' },
            { label: `${icons.delete} Yes, delete`, value: 'yes' }
          ],
          onSelect: handleDeleteConfirm
        })
      )
    );
  }

  // Edit mode
  if (mode === 'edit') {
    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: colors.primary }, `${icons.edit} Edit `),
        h(Text, { bold: true, color: colors.accent }, varKey)
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.accent,
        paddingX: 2,
        paddingY: 1
      },
        h(Box, { marginBottom: 1 },
          h(Text, { color: colors.textDim }, 'New value:')
        ),
        h(Box, {
          borderStyle: 'round',
          borderColor: colors.border,
          paddingX: 1
        },
          h(TextInput, {
            value: editValue,
            onChange: setEditValue,
            onSubmit: handleEditSubmit
          })
        )
      )
    );
  }

  // View mode
  const actionItems = [
    { label: `${icons.edit}  Edit value`, value: 'edit' },
    { label: `${icons.delete}  Delete`, value: 'delete' },
    { label: `${icons.back}  Back to list`, value: 'back' }
  ];

  return h(Box, { flexDirection: 'column' },
    // Title
    h(Box, { marginBottom: 1 },
      h(Text, { bold: true, color: colors.primary }, `${icons.key} `),
      h(Text, { bold: true, color: colors.accent }, varKey)
    ),

    // Info card
    h(Box, {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: colors.border,
      paddingX: 2,
      paddingY: 1,
      marginBottom: 1
    },
      h(InfoRow, {
        icon: icons.value,
        label: 'Value:',
        value: displayValue
      }),

      data.description && h(InfoRow, {
        icon: icons.description,
        label: 'Desc:',
        value: data.description
      }),

      h(Box, { marginTop: data.description ? 0 : 0 },
        h(Box, { width: 14 },
          h(Text, { color: colors.textDim }, `${icons.tags} `),
          h(Text, { color: colors.textMuted, bold: true }, 'Tags:')
        ),
        h(TagBadges, { tags: data.tags })
      ),

      data.created_at && h(Box, { marginTop: 1 },
        h(InfoRow, {
          icon: icons.time,
          label: 'Created:',
          value: new Date(data.created_at).toLocaleString(),
          valueColor: colors.textMuted
        })
      )
    ),

    // Actions
    h(Box, { marginBottom: 1 },
      h(Text, { color: colors.textDim }, 'Actions:')
    ),
    h(Box, {
      borderStyle: 'round',
      borderColor: colors.border,
      paddingX: 1
    },
      h(SelectInput, {
        items: actionItems,
        onSelect: handleAction
      })
    )
  );
}
