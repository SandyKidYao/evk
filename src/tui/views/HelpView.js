import React from 'react';
import { Box, Text } from 'ink';
import { colors, cells } from '../theme.js';
import { fit } from '../layout.js';

const { createElement: h } = React;

const KEYS = [
  ['arrows / hjkl', 'move between cells'],
  ['space', 'queue a change on this cell: add [+] · remove [-] · update [~]'],
  ['u', 'queue every stale ◐ cell for update'],
  ['c', 'queue clearing this whole file (removes the evk block)'],
  ['x', 'drop everything queued'],
  ['a', 'preview the combined diff, then write'],
  ['e / enter', 'edit this value'],
  ['n', 'new value (prefilled with this key)'],
  ['d', 'delete this value from the store'],
  ['v / y', 'show for 5s / copy without showing'],
  ['/', 'filter rows by key, tag or description'],
  ['i', 'import variables from a file'],
  ['t / T', 'add a file column / forget this column'],
  ['q', 'quit']
];

export default function HelpView() {
  return h(Box, { flexDirection: 'column' },
    h(Text, { bold: true }, 'Keys'),
    h(Text, null, ' '),
    ...KEYS.map(([k, d]) => h(Text, { key: k },
      h(Text, { color: colors.accent }, '  ' + fit(k, 16)),
      h(Text, null, d)
    )),
    h(Text, null, ' '),
    h(Text, { bold: true }, 'Cells'),
    h(Text, null,
      h(Text, { color: colors.ok }, '  ' + cells.ok.trim()), h(Text, { color: colors.dim }, ' written & current    '),
      h(Text, { color: colors.stale }, cells.stale.trim()), h(Text, { color: colors.dim }, ' store changed since it was written    '),
      h(Text, { color: colors.muted }, cells.none.trim()), h(Text, { color: colors.dim }, ' not in this file')
    ),
    h(Text, null,
      h(Text, { color: colors.dim }, '  ' + cells.untracked.trim()), h(Text, { color: colors.dim }, ' in the file’s evk block but not in the store — space queues its removal, e imports it')
    ),
    h(Text, null, ' '),
    h(Text, { color: colors.muted }, '  Nothing touches a file until you press a and confirm the preview.')
  );
}
