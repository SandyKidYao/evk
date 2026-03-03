import React from 'react';
import { Box, Text } from 'ink';
import { colors, icons } from '../theme.js';

const { createElement: h } = React;

const BANNER_TEXTS = [
  '  ███████╗██╗   ██╗██╗  ██╗',
  '  ██╔════╝██║   ██║██║ ██╔╝',
  '  █████╗  ██║   ██║█████╔╝ ',
  '  ██╔══╝  ╚██╗ ██╔╝██╔═██╗ ',
  '  ███████╗ ╚████╔╝ ██║  ██╗',
  '  ╚══════╝  ╚═══╝  ╚═╝  ╚═╝',
];

export default function Banner({ version }) {
  return h(Box, { flexDirection: 'column', marginBottom: 1 },
    // ASCII Art Logo with theme-adaptive gradient
    ...BANNER_TEXTS.map((text, i) =>
      h(Text, { key: `banner-line-${i}`, color: colors.bannerGradient[i], bold: true }, text)
    ),
    // Tagline
    h(Box, { key: 'tagline', marginTop: 0 },
      h(Text, { color: colors.accent }, `    ${icons.lock} `),
      h(Text, { color: colors.bannerTagline }, 'Environment Variable Keeper'),
      version && h(Text, { color: colors.bannerVersion }, ` v${version}`)
    )
  );
}
