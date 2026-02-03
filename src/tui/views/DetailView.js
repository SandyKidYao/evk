import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { getVariableById, removeVariable, updateVariableById } from '../../core/store.js';
import { colors, icons, getTagColor } from '../theme.js';

const EDIT_STEPS = { KEY: 0, VALUE: 1, TAGS: 2, CONFIRM: 3 };
const EDIT_STEP_LABELS = ['Key', 'Value', 'Tags', 'Confirm'];

const { createElement: h } = React;

// Info row component
function InfoRow({ label, value, valueColor, children }) {
  return h(Box, { marginBottom: 0 },
    h(Box, { width: 10 },
      h(Text, { color: colors.textMuted, bold: true }, label)
    ),
    children || h(Text, { color: valueColor || colors.text }, value || '(empty)')
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

// Step indicator for edit mode
function EditStepIndicator({ currentStep, totalSteps }) {
  const steps = [];
  for (let i = 0; i < totalSteps; i++) {
    const isActive = i === currentStep;
    const isCompleted = i < currentStep;

    if (i > 0) {
      steps.push(
        h(Text, {
          key: `line-${i}`,
          color: isCompleted ? colors.success : colors.textMuted
        }, '━━')
      );
    }

    steps.push(
      h(Text, {
        key: `step-${i}`,
        color: isActive ? colors.accent : isCompleted ? colors.success : colors.textMuted,
        bold: isActive
      }, isCompleted ? icons.check : isActive ? icons.check : icons.uncheck)
    );
  }

  return h(Box, { marginBottom: 1 },
    h(Text, { color: colors.textDim }, '['),
    ...steps,
    h(Text, { color: colors.textDim }, ']  '),
    h(Text, { color: colors.primary, bold: true }, `Step ${currentStep + 1}/${totalSteps}: `),
    h(Text, { color: colors.text }, EDIT_STEP_LABELS[currentStep])
  );
}

export default function DetailView({ varId, onBack, showMessage, setFooterHints }) {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState('view'); // view, edit, confirmDelete

  // Edit mode states
  const [editStep, setEditStep] = useState(EDIT_STEPS.KEY);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editTags, setEditTags] = useState('');

  // Update footer hints - DetailView has no special shortcuts
  useEffect(() => {
    setFooterHints([]);
  }, [setFooterHints]);

  useEffect(() => {
    const varData = getVariableById(varId);
    setData(varData);
    if (varData) {
      // Pre-fill edit fields
      setEditKey(varData.key);
      setEditValue(varData.value);
      setEditTags(varData.tags ? varData.tags.join(', ') : '');
    }
  }, [varId]);

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'view') {
        onBack();
      } else if (mode === 'edit') {
        // In edit mode, go back a step or exit edit mode
        if (editStep === EDIT_STEPS.KEY) {
          // Reset and exit edit mode
          resetEditFields();
          setMode('view');
        } else {
          setEditStep(editStep - 1);
        }
      } else {
        setMode('view');
      }
    }
  });

  const resetEditFields = () => {
    if (data) {
      setEditKey(data.key);
      setEditValue(data.value);
      setEditTags(data.tags ? data.tags.join(', ') : '');
    }
    setEditStep(EDIT_STEPS.KEY);
  };

  const handleAction = (item) => {
    switch (item.value) {
      case 'edit':
        setEditStep(EDIT_STEPS.KEY);
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

  // Edit step handlers
  const handleKeySubmit = () => {
    if (!editKey.trim()) return;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(editKey)) {
      showMessage('Invalid key name', 'error');
      return;
    }
    setEditStep(EDIT_STEPS.VALUE);
  };

  const handleValueSubmit = () => setEditStep(EDIT_STEPS.TAGS);
  const handleTagsSubmit = () => setEditStep(EDIT_STEPS.CONFIRM);

  const handleEditConfirm = () => {
    try {
      const tagList = editTags.trim() ? editTags.split(',').map(t => t.trim()) : [];
      const updated = updateVariableById(data.id, {
        key: editKey,
        value: editValue,
        tags: tagList
      });
      if (updated) {
        setData(updated);
        showMessage(`Updated ${editKey}`);
      }
      resetEditFields();
      setMode('view');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const handleDeleteConfirm = (item) => {
    if (item.value === 'yes') {
      try {
        removeVariable(varId, { byId: true });
        showMessage(`Removed ${data.key}`);
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
        h(Text, { color: colors.error, bold: true }, `${icons.delete} Delete "${data.key}"?`)
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

  // Edit mode - multi-step form
  if (mode === 'edit') {
    // Input field component for edit mode
    const EditInputField = ({ label, fieldValue, isActive, onChange, onSubmit }) =>
      h(Box, { marginBottom: 1 },
        h(Box, { width: 16 },
          h(Text, { color: isActive ? colors.accent : colors.textDim, bold: isActive },
            `${isActive ? icons.arrow : ' '} ${label}: `
          )
        ),
        isActive
          ? h(Box, {
              borderStyle: 'round',
              borderColor: colors.accent,
              paddingX: 1,
              minWidth: 30
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

    return h(Box, { flexDirection: 'column' },
      // Title
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: colors.primary }, `${icons.edit} Edit Variable`)
      ),

      // Step indicator
      h(EditStepIndicator, { currentStep: editStep, totalSteps: 4 }),

      // Form fields
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.border,
        paddingX: 2,
        paddingY: 1,
        marginBottom: 1
      },
        // Key field
        h(EditInputField, {
          label: 'Key',
          fieldValue: editKey,
          isActive: editStep === EDIT_STEPS.KEY,
          onChange: setEditKey,
          onSubmit: handleKeySubmit
        }),

        // Value field
        editStep >= EDIT_STEPS.VALUE && h(EditInputField, {
          label: 'Value',
          fieldValue: editValue,
          isActive: editStep === EDIT_STEPS.VALUE,
          onChange: setEditValue,
          onSubmit: handleValueSubmit
        }),

        // Tags field
        editStep >= EDIT_STEPS.TAGS && h(EditInputField, {
          label: 'Tags',
          fieldValue: editTags,
          isActive: editStep === EDIT_STEPS.TAGS,
          onChange: setEditTags,
          onSubmit: handleTagsSubmit
        }),

        // Confirm
        editStep === EDIT_STEPS.CONFIRM && h(Box, { flexDirection: 'column', marginTop: 1 },
          h(Box, { marginBottom: 1 },
            h(Text, { color: colors.success, bold: true }, `${icons.check} Ready to save!`)
          ),
          h(Box, null,
            h(Text, { color: colors.textDim }, 'Press '),
            h(Text, { color: colors.accent }, 'Enter'),
            h(Text, { color: colors.textDim }, ' to confirm')
          ),
          h(TextInput, { value: '', onChange: () => {}, onSubmit: handleEditConfirm })
        )
      )
    );
  }

  // View mode
  const actionItems = [
    { label: `${icons.edit}  Edit`, value: 'edit' },
    { label: `${icons.delete}  Delete`, value: 'delete' },
    { label: `${icons.back}  Back to list`, value: 'back' }
  ];

  return h(Box, { flexDirection: 'column' },
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
        label: 'Key:',
        children: h(Text, { color: colors.accent, bold: true }, data.key)
      }),

      h(InfoRow, {
        label: 'Value:',
        value: displayValue
      }),

      data.description && h(InfoRow, {
        label: 'Desc:',
        value: data.description
      }),

      h(InfoRow, {
        label: 'Tags:',
        children: h(TagBadges, { tags: data.tags })
      }),

      data.created_at && h(Box, { marginTop: 1 },
        h(InfoRow, {
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
