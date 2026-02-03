// Unified color theme for evk TUI
export const colors = {
  // Primary blues (gradient)
  primary: '#1E90FF',      // Dodger Blue
  primaryLight: '#87CEEB', // Sky Blue
  primaryDark: '#4169E1',  // Royal Blue

  // Accent colors
  accent: '#00BFFF',       // Deep Sky Blue
  success: '#32CD32',      // Lime Green
  error: '#FF6B6B',        // Soft Red
  warning: '#FFD93D',      // Yellow

  // Neutral colors
  text: '#E0E0E0',         // Light gray text
  textDim: '#708090',      // Slate Gray
  textMuted: '#4A5568',    // Darker gray
  border: '#4A5568',       // Border color
  borderLight: '#718096',  // Lighter border

  // Tag colors (for badges)
  tags: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
};

// Icons for menu items and status
export const icons = {
  // Menu
  list: '📋',
  add: '➕',
  sync: '🔄',
  clean: '🧹',
  exit: '🚪',

  // Status
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',

  // Detail
  key: '🔑',
  value: '📝',
  tags: '🏷️',
  time: '🕐',
  description: '📄',

  // Actions
  edit: '✏️',
  delete: '🗑️',
  back: '↩️',
  save: '💾',

  // Misc
  lock: '🔐',
  bullet: '•',
  arrow: '›',
  check: '●',
  uncheck: '○',
};

// Get a consistent color for a tag based on its name
export function getTagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors.tags[Math.abs(hash) % colors.tags.length];
}

// Border styles
export const borders = {
  normal: 'single',
  rounded: 'round',
  bold: 'bold',
  double: 'double',
};
