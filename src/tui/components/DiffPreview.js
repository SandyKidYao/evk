import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme.js';
import { maskValue } from '../../utils/mask.js';
import { fit } from '../layout.js';

const { createElement: h } = React;

const fmt = (type, key, value) =>
  type === 'shell' ? `export ${key}="${maskValue(key, value)}"` : `${key}=${maskValue(key, value)}`;

// Flatten plans into display lines: [{ text, color, bold }]
export function diffLines(plans) {
  const L = [];
  for (const p of plans) {
    const t = p.target;
    const n = op => p.changes.filter(c => c.op === op).length;
    const summary = [
      n('+') && `+${n('+')}`,
      n('~') && `~${n('~')}`,
      n('-') && `-${n('-')}`,
      p.newBlock && (t.exists ? 'adds evk block' : 'creates file'),
      p.removeBlock && 'removes evk block',
      !p.changes.length && !p.removeBlock && 'records ownership only'
    ].filter(Boolean).join('  ');
    L.push({ parts: [{ text: t.display, bold: true }, { text: '   ' + summary, color: colors.dim }] });
    for (const c of p.changes) {
      if (c.op === '+') L.push({ parts: [{ text: '  + ' + fmt(t.type, c.key, c.to), color: colors.ok }] });
      else if (c.op === '-') L.push({ parts: [{ text: '  - ' + fmt(t.type, c.key, c.from), color: colors.bad }] });
      else {
        L.push({ parts: [{ text: '  - ' + fmt(t.type, c.key, c.from), color: colors.bad }] });
        L.push({ parts: [{ text: '  + ' + fmt(t.type, c.key, c.to), color: colors.ok }] });
      }
    }
    for (const key of p.toComment) {
      L.push({ parts: [{ text: '  # ' + fmt(t.type, key, t.outside[key]), color: colors.stale },
        { text: '   same key outside the block → commented out, restored by clean', color: colors.muted }] });
    }
    for (const c of p.toRestore) {
      L.push({ parts: [{ text: '  ↺ ' + fmt(t.type, c.key, c.value), color: colors.ok },
        { text: '   restored (evk had commented it out)', color: colors.muted }] });
    }
    L.push({ parts: [{ text: ' ' }] });
  }
  return L;
}

export default function DiffPreview({ plans, offset, height, width }) {
  const lines = diffLines(plans);
  const outsideN = plans.reduce((n, p) => n + p.toComment.length + p.toRestore.length, 0);
  const files = plans.length;
  const bodyH = Math.max(1, height - 2);
  const visible = lines.slice(offset, offset + bodyH);
  const more = lines.length - offset - visible.length;
  return h(Box, { flexDirection: 'column' },
    h(Text, null,
      h(Text, { bold: true }, `Write ${files} file${files > 1 ? 's' : ''}`),
      outsideN
        ? h(Text, { color: colors.stale }, `   ${outsideN} line${outsideN > 1 ? 's' : ''} outside evk’s block will be commented out or restored (# / ↺ below)`)
        : h(Text, { color: colors.dim }, '   only evk’s managed block changes; the rest of each file stays as it is')
    ),
    h(Text, null, ' '),
    ...visible.map((l, i) => h(Text, { key: i, wrap: 'truncate' },
      ...l.parts.map((p, j) => h(Text, { key: j, color: p.color, bold: p.bold }, p.text))
    )),
    more > 0 ? h(Text, { color: colors.muted }, fit(`  … ${more} more line${more > 1 ? 's' : ''} · ↓ to scroll`, width)) : null
  );
}
