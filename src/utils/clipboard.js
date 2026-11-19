import { spawnSync } from 'child_process';

/**
 * Copy text to the system clipboard without printing it.
 * Tries the platform tool first, then falls back to an OSC 52 escape
 * sequence (works in most modern terminals, including over SSH).
 * @returns {boolean} true if a copy mechanism succeeded
 */
export function copyToClipboard(text) {
  const candidates = process.platform === 'darwin'
    ? [['pbcopy', []]]
    : process.platform === 'win32'
      ? [['clip', []]]
      : [['wl-copy', []], ['xclip', ['-selection', 'clipboard']], ['xsel', ['--clipboard', '--input']]];

  for (const [cmd, args] of candidates) {
    try {
      const r = spawnSync(cmd, args, { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
      if (!r.error && r.status === 0) return true;
    } catch {
      // try the next one
    }
  }

  try {
    process.stdout.write(`\x1b]52;c;${Buffer.from(text).toString('base64')}\x07`);
    return true;
  } catch {
    return false;
  }
}
