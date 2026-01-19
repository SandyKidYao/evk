import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { addVariable } from '../../core/store.js';

const { createElement: h } = React;

const STEPS = { KEY: 0, VALUE: 1, TAGS: 2, CONFIRM: 3 };

export default function AddView({ onBack, onCancel, showMessage }) {
  const [step, setStep] = useState(STEPS.KEY);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [tags, setTags] = useState('');

  useInput((input, keyObj) => {
    if (keyObj.escape) {
      step === STEPS.KEY ? onCancel() : setStep(step - 1);
    }
  });

  const handleKeySubmit = () => {
    if (!key.trim()) return;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      showMessage('Invalid key name', 'error');
      return;
    }
    setStep(STEPS.VALUE);
  };

  const handleValueSubmit = () => {
    setStep(STEPS.TAGS);
  };

  const handleTagsSubmit = () => setStep(STEPS.CONFIRM);

  const handleConfirm = () => {
    try {
      const tagList = tags.trim() ? tags.split(',').map(t => t.trim()) : [];
      addVariable(key, value, { tags: tagList });
      showMessage(`Added ${key}`);
      onBack();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 }, h(Text, { bold: true }, 'Add Variable')),

    // Key
    h(Box, { marginBottom: 1 },
      h(Text, { color: step === STEPS.KEY ? 'cyan' : 'gray' }, 'Key: '),
      step === STEPS.KEY
        ? h(TextInput, { value: key, onChange: setKey, onSubmit: handleKeySubmit })
        : h(Text, null, key)
    ),

    // Value
    step >= STEPS.VALUE && h(Box, { marginBottom: 1 },
      h(Text, { color: step === STEPS.VALUE ? 'cyan' : 'gray' }, 'Value: '),
      step === STEPS.VALUE
        ? h(TextInput, { value, onChange: setValue, onSubmit: handleValueSubmit })
        : h(Text, { color: value ? undefined : 'gray' }, value ? (value.length > 40 ? value.slice(0, 37) + '...' : value) : '(empty)')
    ),

    // Tags
    step >= STEPS.TAGS && h(Box, { marginBottom: 1 },
      h(Text, { color: step === STEPS.TAGS ? 'cyan' : 'gray' }, 'Tags (optional): '),
      step === STEPS.TAGS
        ? h(TextInput, { value: tags, onChange: setTags, onSubmit: handleTagsSubmit })
        : h(Text, { color: 'gray' }, tags || '(none)')
    ),

    // Confirm
    step === STEPS.CONFIRM && h(Box, { flexDirection: 'column', marginTop: 1 },
      h(Text, null, 'Add this variable? Press Enter to confirm'),
      h(TextInput, { value: '', onChange: () => {}, onSubmit: handleConfirm })
    ),

    h(Box, { marginTop: 1 },
      h(Text, { color: 'gray' }, 'Enter to continue, Esc to go back')
    )
  );
}
