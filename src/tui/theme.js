// Terminal palette for the board.
// Main text uses the terminal's own foreground (color: undefined) so evk
// sits inside the user's theme. The accent is reserved for the cursor and
// the keys you can press; state colours appear only where they mean
// something, and every state also has a glyph.

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
  text: undefined,          // terminal foreground
  dim: '#A3A8B0',           // secondary text
  muted: '#7F858E',         // hints, legend, empty cells
  rule: '#3A3F46',          // horizontal rules
  accent: '#F0C674',        // cursor + actionable keys only
  accentFg: '#15171A',      // text on the accent (cursor cell)
  selBg: '#262A31',         // selected row
  ok: '#98C379',            // written & current
  stale: '#E5A54B',         // store changed since write / pending update
  bad: '#EF7B72',           // removal, errors
  tags: { dev: '#86B6E0', staging: '#BFA6E6', prod: '#E0A487' },
  tagCycle: ['#A9C2A0', '#D7B98A', '#9FC3C9', '#C9A9C2']
};

const lightColors = {
  text: undefined,
  dim: '#4F555D',
  muted: '#6B7179',
  rule: '#C9C3B6',
  accent: '#8A5A00',
  accentFg: '#F8F6F1',
  selBg: '#E8E2D4',
  ok: '#2D7A31',
  stale: '#B4470F',
  bad: '#B3261E',
  tags: { dev: '#1F5F99', staging: '#6A3FB0', prod: '#A3461C' },
  tagCycle: ['#3F6B34', '#7A5A12', '#1F6B73', '#7A3F6B']
};

export const colorScheme = detectColorScheme();
export const colors = colorScheme === 'light' ? lightColors : darkColors;

const TAG_ALIASES = { development: 'dev', production: 'prod', stage: 'staging' };

// Consistent colour for a tag: known environments get fixed hues,
// anything else hashes into a small muted cycle.
export function getTagColor(tag) {
  const known = colors.tags[TAG_ALIASES[tag] || tag];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return colors.tagCycle[Math.abs(hash) % colors.tagCycle.length];
}

// Cell glyphs: always 3 columns wide so the grid stays aligned
export const cells = {
  ok: ' ● ',
  stale: ' ◐ ',
  none: ' · ',
  untracked: ' ○ ',
  add: '[+]',
  remove: '[-]',
  update: '[~]'
};

export const glyphs = {
  pointer: '›',
  rule: '─',
  ok: '✓',
  warn: '!',
  err: '✗',
  info: '·',
  more: '…'
};
