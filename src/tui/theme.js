// Detect terminal color scheme from environment
function detectColorScheme() {
  // User override via env var: EVK_COLOR_SCHEME=light or EVK_COLOR_SCHEME=dark
  const forced = process.env.EVK_COLOR_SCHEME?.toLowerCase();
  if (forced === 'light' || forced === 'dark') return forced;

  // COLORFGBG is set by xterm-compatible terminals as "fg;bg" color indices
  // e.g. "15;0" = white text on black (dark), "0;15" = black text on white (light)
  const colorfgbg = process.env.COLORFGBG;
  if (colorfgbg) {
    const parts = colorfgbg.split(';');
    const bg = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(bg)) return bg < 8 ? 'dark' : 'light';
  }

  // Default to dark (most common for developer terminals)
  return 'dark';
}

const darkColors = {
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
  textDim: '#C0CEDB',      // Secondary text — readable even on semi-transparent dark terminals
  textMuted: '#96AAB8',    // Muted/tertiary text — still visible on semi-transparent backgrounds
  border: '#7A8FA0',       // Border — high enough contrast to be seen on dark bg
  borderLight: '#9AAAB8',  // Lighter border

  // Banner gradient (top to bottom: bright → pale blue)
  bannerGradient: ['#00BFFF', '#1E90FF', '#4169E1', '#6495ED', '#87CEEB', '#B0E0E6'],
  bannerTagline: '#B0C4DE',
  bannerVersion: '#96AAB8',

  // Tag colors (for badges)
  tags: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
};

const lightColors = {
  // Primary blues — darker to be readable on light backgrounds
  primary: '#1565C0',      // Material Blue 800
  primaryLight: '#1976D2', // Material Blue 700
  primaryDark: '#0D47A1',  // Material Blue 900

  // Accent colors
  accent: '#0277BD',       // Dark Cyan Blue
  success: '#2E7D32',      // Dark Green
  error: '#C62828',        // Dark Red
  warning: '#E65100',      // Dark Orange (yellow is invisible on light bg)

  // Neutral colors
  text: '#1A1A2E',         // Very dark navy
  textDim: '#546E7A',      // Blue Gray
  textMuted: '#78909C',    // Lighter Blue Gray
  border: '#90A4AE',       // Light Blue Gray
  borderLight: '#B0BEC5',  // Pale Blue Gray

  // Banner gradient (top to bottom: dark → lighter blue)
  bannerGradient: ['#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#42A5F5'],
  bannerTagline: '#37474F',
  bannerVersion: '#546E7A',

  // Tag colors — saturated but dark enough for light backgrounds
  tags: ['#C62828', '#00695C', '#1565C0', '#558B2F', '#E65100', '#7B1FA2', '#00838F', '#F57F17'],
};

export const colorScheme = detectColorScheme();
export const colors = colorScheme === 'light' ? lightColors : darkColors;

// Icons for menu items and status
export const icons = {
  // Menu
  list: '≡',
  add: '+',
  sync: '↻',
  import: '↓',
  clean: '×',
  exit: '←',

  // Status
  success: '✓',
  error: '✗',
  warning: '!',
  info: 'i',

  // Detail
  key: '#',
  value: '=',
  tags: '@',
  time: '~',
  description: '-',

  // Actions
  edit: '~',
  delete: '×',
  back: '←',
  save: '↓',

  // Misc
  lock: '»',
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
