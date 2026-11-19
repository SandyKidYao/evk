import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme.js';

const { createElement: h } = React;

const BANNER_TEXTS = [
  '███████╗██╗   ██╗██╗  ██╗',
  '██╔════╝██║   ██║██║ ██╔╝',
  '█████╗  ██║   ██║█████╔╝ ',
  '██╔══╝  ╚██╗ ██╔╝██╔═██╗ ',
  '███████╗ ╚████╔╝ ██║  ██╗',
  '╚══════╝  ╚═══╝  ╚═╝  ╚═╝'
];

// Shown only on an empty store: the first-run welcome.
export default function Banner({ version }) {
  return h(Box, { flexDirection: 'column', marginBottom: 1 },
    ...BANNER_TEXTS.map((text, i) => h(Text, { key: i, color: colors.accent }, text)),
    h(Text, null,
      h(Text, { color: colors.dim }, 'Environment Variable Keeper'),
      version ? h(Text, { color: colors.muted }, ` v${version}`) : null
    )
  );
}
