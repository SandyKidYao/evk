import React, { useState, useMemo, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { detectConflicts, executeImport } from '../../core/import.js';
import { readTarget } from '../../core/board.js';
import { getAllVariables } from '../../core/store.js';
import { colors, glyphs } from '../theme.js';
import { maskValue } from '../../utils/mask.js';
import { fit, scrollWindow } from '../layout.js';

const { createElement: h } = React;

const KIND = {
  new: { label: 'new', color: 'ok' },
  newValue: { label: 'new value', color: 'stale' },
  differs: { label: 'overwrites the store value', color: 'stale' },
  same: { label: 'already in the store', color: 'muted' }
};

// Import variables from a file: a checklist, new keys preselected.
export default function ImportPanel({ defaultPath, height, width, onClose }) {
  const [sourcePath, setSourcePath] = useState(defaultPath);
  const [pathDraft, setPathDraft] = useState(defaultPath);
  const [tags, setTags] = useState('');
  const [editing, setEditing] = useState(null); // 'path' | 'tags' | null
  const [cursor, setCursor] = useState(0);
  const offsetRef = useRef(0);

  const tagList = useMemo(() => tags.split(/[\s,]+/).filter(Boolean), [tags]);
  const { items, error } = useMemo(() => {
    // Only lines outside evk's managed block: the block came from the store
    const parsed = readTarget(sourcePath);
    if (!parsed.exists) return { items: [], error: `file not found: ${sourcePath}` };
    const { toImport, conflicts, unchanged } = detectConflicts(parsed.outside, tagList);
    const existing = getAllVariables();
    const others = k => existing.filter(e => e.key === k).map(e => (e.tags.length ? e.tags.join('+') : 'untagged'));
    const list = [
      ...toImport.map(v => (others(v.key).length
        ? { ...v, kind: 'newValue', note: `${tagList.length ? tagList.join('+') : 'untagged'} · also has ${others(v.key).join(', ')}` }
        : { ...v, kind: 'new' })),
      ...conflicts.map(v => ({ key: v.key, value: v.value, kind: 'differs' })),
      ...unchanged.map(v => ({ key: v.key, value: v.value, kind: 'same' }))
    ].sort((a, b) => a.key.localeCompare(b.key));
    return { items: list, error: null };
  }, [sourcePath, tagList]);

  const [selected, setSelected] = useState(null); // Set of keys; null = default
  const sel = selected || new Set(items.filter(i => i.kind === 'new').map(i => i.key));

  useInput((input, key) => {
    if (editing) {
      if (key.escape) {
        setEditing(null);
        setPathDraft(sourcePath);
      }
      return;
    }
    if (key.escape || input === 'q') return onClose(null);
    if (key.upArrow || input === 'k') setCursor(c => Math.max(0, c - 1));
    else if (key.downArrow || input === 'j') setCursor(c => Math.min(items.length - 1, c + 1));
    else if (input === ' ' && items[cursor] && items[cursor].kind !== 'same') {
      const next = new Set(sel);
      const k = items[cursor].key;
      next.has(k) ? next.delete(k) : next.add(k);
      setSelected(next);
    } else if (input === 'p') setEditing('path');
    else if (input === 't') setEditing('tags');
    else if (key.return) {
      const pick = items.filter(i => sel.has(i.key) && i.kind !== 'same');
      if (!pick.length) return onClose({ text: 'nothing selected · nothing imported', kind: 'info' });
      executeImport(pick.map(({ key: k, value }) => ({ key: k, value })), { tags: tagList, description: '' });
      onClose({
        text: `imported ${pick.length} value${pick.length > 1 ? 's' : ''} from ${sourcePath}${tagList.length ? ' as [' + tagList.join('+') + ']' : ''}`,
        kind: 'ok'
      });
    }
  });

  const listH = Math.max(1, height - 4);
  const off = scrollWindow(offsetRef.current, cursor, listH, items.length);
  offsetRef.current = off;

  const field = (name, label, value, onChange, onSubmit) => h(Box, null,
    h(Text, { color: editing === name ? colors.accent : colors.dim }, fit(label, 8)),
    editing === name
      ? h(TextInput, { value, onChange, onSubmit })
      : h(Text, null, value || h(Text, { color: colors.muted }, 'none')),
    editing === name ? null : h(Text, { color: colors.muted }, `   ${name === 'path' ? 'p' : 't'} to change`)
  );

  return h(Box, { flexDirection: 'column' },
    h(Text, { bold: true }, 'Import'),
    field('path', 'from', editing === 'path' ? pathDraft : sourcePath, setPathDraft, v => {
      setSourcePath(v.trim() || sourcePath);
      setEditing(null);
      setSelected(null);
      setCursor(0);
    }),
    field('tags', 'as tags', tags, v => { setTags(v); setSelected(null); }, () => setEditing(null)),
    h(Text, null, ' '),
    error
      ? h(Text, { color: colors.bad }, `${glyphs.err} ${error}`)
      : items.length === 0
        ? h(Text, { color: colors.muted }, 'no variables outside evk’s block in this file')
        : h(Box, { flexDirection: 'column' },
            ...items.slice(off, off + listH).map((it, i) => {
              const idx = off + i;
              const on = idx === cursor;
              const k = KIND[it.kind];
              const box = it.kind === 'same' ? '   ' : sel.has(it.key) ? '[x]' : '[ ]';
              const bg = on ? colors.selBg : undefined;
              return h(Text, { key: it.key, wrap: 'truncate' },
                h(Text, { color: colors.accent, backgroundColor: bg }, on ? `${glyphs.pointer} ` : '  '),
                h(Text, { color: sel.has(it.key) ? colors.accent : colors.muted, backgroundColor: bg }, box + ' '),
                h(Text, { bold: on, backgroundColor: bg }, fit(it.key, 22)),
                h(Text, { color: colors.dim, backgroundColor: bg }, fit(maskValue(it.key, it.value), 24) + '  '),
                h(Text, { color: colors[k.color], backgroundColor: bg }, fit(it.note || k.label, Math.max(4, width - 54)))
              );
            })
          )
  );
}
