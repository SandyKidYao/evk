import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { getVariable, removeVariable, addVariable } from '../../core/store.js';

const { createElement: h } = React;

export default function DetailView({ varKey, onBack, showMessage }) {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState('view'); // view, edit, confirmDelete
  const [editValue, setEditValue] = useState('');

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
    if (!editValue.trim()) {
      showMessage('Value cannot be empty', 'error');
      return;
    }
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

  if (!data) return h(Text, { color: 'red' }, 'Variable not found');

  // Confirm delete mode
  if (mode === 'confirmDelete') {
    return h(Box, { flexDirection: 'column' },
      h(Text, { color: 'red', bold: true }, `Delete ${varKey}?`),
      h(Box, { marginTop: 1 },
        h(SelectInput, {
          items: [
            { label: 'No, cancel', value: 'no' },
            { label: 'Yes, delete', value: 'yes' }
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
        h(Text, { bold: true }, 'Edit '),
        h(Text, { bold: true, color: 'cyan' }, varKey)
      ),
      h(Box, { marginBottom: 1 },
        h(Text, { color: 'gray' }, 'New value: '),
        h(TextInput, {
          value: editValue,
          onChange: setEditValue,
          onSubmit: handleEditSubmit
        })
      ),
      h(Box, { marginTop: 1 },
        h(Text, { color: 'gray' }, 'Enter to save, Esc to cancel')
      )
    );
  }

  // View mode
  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 }, h(Text, { bold: true, color: 'cyan' }, varKey)),

    h(Box, { flexDirection: 'column', borderStyle: 'single', borderColor: 'gray', paddingX: 1, marginBottom: 1 },
      h(Box, null,
        h(Text, { color: 'gray', bold: true }, 'Value:'.padEnd(12)),
        h(Text, null, data.value)
      ),
      data.description && h(Box, null,
        h(Text, { color: 'gray', bold: true }, 'Description:'.padEnd(12)),
        h(Text, null, data.description)
      ),
      data.tags?.length > 0 && h(Box, null,
        h(Text, { color: 'gray', bold: true }, 'Tags:'.padEnd(12)),
        h(Text, { color: 'blue' }, data.tags.join(', '))
      ),
      data.created_at && h(Box, null,
        h(Text, { color: 'gray', bold: true }, 'Created:'.padEnd(12)),
        h(Text, { color: 'gray' }, data.created_at)
      )
    ),

    h(Text, { color: 'gray' }, 'Actions:'),
    h(SelectInput, {
      items: [
        { label: 'Edit value', value: 'edit' },
        { label: 'Delete', value: 'delete' },
        { label: 'Back to list', value: 'back' }
      ],
      onSelect: handleAction
    })
  );
}
