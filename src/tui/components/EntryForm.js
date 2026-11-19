import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { colors, glyphs } from '../theme.js';
import { maskValue } from '../../utils/mask.js';
import { fit } from '../layout.js';

const { createElement: h } = React;

export const FORM_FIELDS = ['key', 'value', 'tags', 'description'];
const PLACEHOLDER = {
  key: 'OPENAI_API_KEY',
  value: 'paste or type the value',
  tags: 'dev, prod …  (optional)',
  description: 'optional'
};
export const FORM_HEIGHT = 7;

export function newForm(mode, entry, preset = {}) {
  const fields = mode === 'edit' && entry
    ? { key: entry.key, value: entry.value, tags: (entry.tags || []).join(', '), description: entry.description || '' }
    : { key: preset.key || '', value: preset.value || '', tags: preset.tags || '', description: '' };
  return {
    mode,
    id: entry ? entry.id : null,
    title: mode === 'edit' && entry ? `Edit ${entry.key}${entry.tags?.length ? ' [' + entry.tags.join('+') + ']' : ''}` : 'New variable',
    focus: fields.key && !fields.value ? 1 : 0,
    fields,
    error: ''
  };
}

// One form for add and edit: every field visible, Tab moves, Enter saves.
export default function EntryForm({ form, onChange, onSubmit, width }) {
  const labelW = 14;
  return h(Box, { flexDirection: 'column' },
    h(Text, { bold: true }, form.title),
    ...FORM_FIELDS.map((f, i) => {
      const focused = form.focus === i;
      const v = form.fields[f];
      const label = h(Text, { color: focused ? colors.accent : colors.dim, bold: focused },
        fit(`${focused ? glyphs.pointer : ' '} ${f}`, labelW));
      if (focused) {
        return h(Box, { key: f },
          label,
          h(TextInput, {
            value: v,
            placeholder: PLACEHOLDER[f],
            onChange: next => onChange(f, next),
            onSubmit
          })
        );
      }
      const shown = f === 'value' ? maskValue(form.fields.key || 'KEY', v) : v;
      return h(Box, { key: f },
        label,
        shown
          ? h(Text, null, fit(shown, Math.max(10, width - labelW)).trimEnd())
          : h(Text, { color: colors.muted }, PLACEHOLDER[f])
      );
    }),
    form.error
      ? h(Text, { color: colors.bad }, `${glyphs.err} ${form.error}`)
      : h(Text, { color: colors.muted },
          form.focus === 1 ? 'the value shows in clear only while this field has focus' : ' ')
  );
}
