// Shared responsive layout helpers for TUI views.
// All widths are border-box (Ink/yoga), so a Box's border and padding
// count toward its own width.

// Horizontal overhead around table rows:
// app padding (2) + list border (2) + list paddingX (2) + selection indicator (2)
const TABLE_OVERHEAD = 8;

// Column widths for KEY / VALUE / TAGS tables (ListView, SyncView)
export function getTableLayout(columns) {
  const usable = Math.max(40, (columns || 80) - TABLE_OVERHEAD);
  const tagsWidth = Math.min(24, Math.max(10, Math.floor(usable * 0.25)));
  const keyWidth = Math.min(48, Math.max(12, Math.floor((usable - tagsWidth) * 0.45)));
  const valueWidth = Math.max(16, usable - tagsWidth - keyWidth);
  return { keyWidth, valueWidth, tagsWidth };
}

// Truncate a string with an ellipsis to fit maxLen columns
export function truncate(value, maxLen) {
  const str = String(value ?? '');
  if (str.length <= maxLen) return str;
  if (maxLen <= 3) return str.slice(0, Math.max(0, maxLen));
  return str.slice(0, maxLen - 3) + '...';
}
