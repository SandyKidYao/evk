import React from 'react';
import { Box, Text } from 'ink';

const { createElement: h } = React;

// ASCII Art with gradient blue colors (top to bottom)
const BANNER_LINES = [
  { text: '  ███████╗██╗   ██╗██╗  ██╗', color: '#00BFFF' },  // Deep Sky Blue
  { text: '  ██╔════╝██║   ██║██║ ██╔╝', color: '#1E90FF' },  // Dodger Blue
  { text: '  █████╗  ██║   ██║█████╔╝ ', color: '#4169E1' },  // Royal Blue
  { text: '  ██╔══╝  ╚██╗ ██╔╝██╔═██╗ ', color: '#6495ED' },  // Cornflower Blue
  { text: '  ███████╗ ╚████╔╝ ██║  ██╗', color: '#87CEEB' },  // Sky Blue
  { text: '  ╚══════╝  ╚═══╝  ╚═╝  ╚═╝', color: '#B0E0E6' },  // Powder Blue
];

export default function Banner({ version }) {
  return h(Box, { flexDirection: 'column', marginBottom: 1 },
    // ASCII Art Logo
    ...BANNER_LINES.map((line, i) =>
      h(Text, { key: `banner-line-${i}`, color: line.color, bold: true }, line.text)
    ),
    // Tagline
    h(Box, { key: 'tagline', marginTop: 0 },
      h(Text, { color: '#4682B4' }, '    '),
      h(Text, { color: '#87CEEB' }, '🔐 '),
      h(Text, { color: '#B0C4DE', dimColor: false }, 'Environment Variable Keeper'),
      version && h(Text, { color: '#708090' }, ` v${version}`)
    )
  );
}
