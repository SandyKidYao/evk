// Width-aware string helpers for a fixed-grid terminal layout.

// East Asian wide / fullwidth ranges and common emoji take 2 columns
function charWidth(cp) {
  if (cp === 0) return 0;
  if (cp < 32 || (cp >= 0x7f && cp < 0xa0)) return 0;
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  ) return 2;
  return 1;
}

export function strWidth(str) {
  let w = 0;
  for (const ch of String(str ?? '')) w += charWidth(ch.codePointAt(0));
  return w;
}

// Truncate with an ellipsis (keeping the start) and pad to exactly `width`
export function fit(str, width) {
  const s = String(str ?? '').replace(/[\r\n\t]/g, ' ');
  if (width <= 0) return '';
  if (strWidth(s) <= width) return s + ' '.repeat(width - strWidth(s));
  let out = '';
  let w = 0;
  for (const ch of s) {
    const cw = charWidth(ch.codePointAt(0));
    if (w + cw > width - 1) break;
    out += ch;
    w += cw;
  }
  return out + '…' + ' '.repeat(Math.max(0, width - w - 1));
}

// Truncate keeping the end (for paths): "…/api/.env"
export function fitLeft(str, width) {
  const s = String(str ?? '');
  if (strWidth(s) <= width) return s;
  const chars = [...s];
  let out = '';
  let w = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    const cw = charWidth(chars[i].codePointAt(0));
    if (w + cw > width - 1) break;
    out = chars[i] + out;
    w += cw;
  }
  return '…' + out;
}

export function center(str, width) {
  const s = fitLeft(str, width);
  const w = strWidth(s);
  const left = Math.floor((width - w) / 2);
  return ' '.repeat(left) + s + ' '.repeat(Math.max(0, width - w - left));
}

// Keep `cursor` visible inside a scrolling window of `size` items
export function scrollWindow(offset, cursor, size, total) {
  let off = offset;
  if (cursor < off) off = cursor;
  if (cursor >= off + size) off = cursor - size + 1;
  off = Math.max(0, Math.min(off, Math.max(0, total - size)));
  return off;
}
