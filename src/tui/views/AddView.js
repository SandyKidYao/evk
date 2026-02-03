import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { addVariable } from '../../core/store.js';
import { colors, icons } from '../theme.js';

const { createElement: h } = React;

const STEPS = { KEY: 0, VALUE: 1, TAGS: 2, CONFIRM: 3 };
const STEP_LABELS = ['Key', 'Value', 'Tags', 'Confirm'];

// Step indicator component
function StepIndicator({ currentStep, totalSteps }) {
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
    h(Text, { color: colors.text }, STEP_LABELS[currentStep])
  );
}

export default function AddView({ onBack, onCancel, showMessage, setFooterHints }) {
  const [step, setStep] = useState(STEPS.KEY);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [tags, setTags] = useState('');

  // Update footer hints - AddView has no special shortcuts
  useEffect(() => {
    setFooterHints([]);
  }, [setFooterHints]);

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

  // Input field component
  const InputField = ({ label, fieldValue, isActive, onChange, onSubmit }) =>
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
      h(Text, { bold: true, color: colors.primary }, `${icons.add} Add Variable`)
    ),

    // Step indicator
    h(StepIndicator, { currentStep: step, totalSteps: 4 }),

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
      h(InputField, {
        label: 'Key',
        fieldValue: key,
        isActive: step === STEPS.KEY,
        onChange: setKey,
        onSubmit: handleKeySubmit
      }),

      // Value field
      step >= STEPS.VALUE && h(InputField, {
        label: 'Value',
        fieldValue: value,
        isActive: step === STEPS.VALUE,
        onChange: setValue,
        onSubmit: handleValueSubmit
      }),

      // Tags field
      step >= STEPS.TAGS && h(InputField, {
        label: 'Tags',
        fieldValue: tags,
        isActive: step === STEPS.TAGS,
        onChange: setTags,
        onSubmit: handleTagsSubmit
      }),

      // Confirm
      step === STEPS.CONFIRM && h(Box, { flexDirection: 'column', marginTop: 1 },
        h(Box, { marginBottom: 1 },
          h(Text, { color: colors.success, bold: true }, `${icons.check} Ready to add!`)
        ),
        h(Box, null,
          h(Text, { color: colors.textDim }, 'Press '),
          h(Text, { color: colors.accent }, 'Enter'),
          h(Text, { color: colors.textDim }, ' to confirm')
        ),
        h(TextInput, { value: '', onChange: () => {}, onSubmit: handleConfirm })
      )
    )
  );
}
