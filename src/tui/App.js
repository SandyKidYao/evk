import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import {
  loadBoard, cellState, planTarget, applyPlan, canonicalPath, recordTarget, forgetTarget
} from '../core/board.js';
import { addVariable, updateVariableById, removeVariable, getStorePath } from '../core/store.js';
import { colors, cells, glyphs, getTagColor } from './theme.js';
import { fit, center, strWidth, scrollWindow } from './layout.js';
import { maskValue } from '../utils/mask.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { expandPath } from '../utils/file.js';
import useTerminalSize from './hooks/useTerminalSize.js';
import EntryForm, { newForm, FORM_HEIGHT } from './components/EntryForm.js';
import DiffPreview, { diffLines } from './components/DiffPreview.js';
import HelpView from './views/HelpView.js';
import ImportPanel from './views/ImportPanel.js';
import Banner from './components/Banner.js';
import fs from 'fs';

const { createElement: h } = React;

const CELL_W = 12;
const PANEL_H = 4;
const pk = (targetPath, rowId) => `${targetPath}\t${rowId}`;
const tagLabel = row => (row.untracked ? 'not in store' : (row.entry.tags || []).join('+'));
const entryName = e => `${e.key}${e.tags && e.tags.length ? ' [' + e.tags.join('+') + ']' : ''}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function safeLoad() {
  try {
    return loadBoard();
  } catch (err) {
    return { error: err.message, entries: [], rows: [], targets: [] };
  }
}

const PENDING_STYLE = {
  add: { glyph: cells.add, color: 'ok' },
  remove: { glyph: cells.remove, color: 'bad' },
  update: { glyph: cells.update, color: 'stale' }
};
const STATE_STYLE = {
  ok: { glyph: cells.ok, color: 'ok' },
  stale: { glyph: cells.stale, color: 'stale' },
  none: { glyph: cells.none, color: 'muted' },
  untracked: { glyph: cells.untracked, color: 'dim' }
};

// Render [key, label] pairs, dropping whole hints that do not fit
function Hints({ items, pinned = [], width }) {
  const cost = ([k, label]) => strWidth(k) + 1 + strWidth(label) + 2;
  const hint = ([k, label]) => h(Text, { key: k + label },
    h(Text, { color: colors.accent }, k),
    h(Text, { color: colors.dim }, ` ${label}  `)
  );
  // Items in priority order until the line is full; pinned ones always show
  let used = pinned.reduce((n, p) => n + cost(p), 0);
  const shown = [];
  for (const item of items) {
    if (used + cost(item) > width) break;
    shown.push(item);
    used += cost(item);
  }
  return h(Text, { wrap: 'truncate' }, ...[...shown, ...pinned].map(hint));
}

function Rule({ width, label }) {
  if (!label) return h(Text, { color: colors.rule }, glyphs.rule.repeat(width));
  const tail = 3;
  return h(Text, null,
    h(Text, { color: colors.rule }, glyphs.rule.repeat(Math.max(0, width - strWidth(label) - 2 - tail)) + ' '),
    h(Text, { color: colors.muted }, label),
    h(Text, { color: colors.rule }, ' ' + glyphs.rule.repeat(tail))
  );
}

export default function App({ version }) {
  const { exit } = useApp();
  const { columns, rows: termRows } = useTerminalSize();

  const [board, setBoard] = useState(safeLoad);
  const [r, setR] = useState(0);
  const [c, setC] = useState(0);
  const [pending, setPending] = useState({});
  const [mode, setMode] = useState('board'); // board|search|form|diff|help|addtarget|confirm|import
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null);
  const [plans, setPlans] = useState(null);
  const [diffOff, setDiffOff] = useState(0);
  const [status, setStatus] = useState(null);
  const [revealed, setRevealed] = useState(null);
  const [pathDraft, setPathDraft] = useState('');
  const [quitArmed, setQuitArmed] = useState(false);
  const revealTimer = useRef(null);
  const rowOff = useRef(0);
  const colOff = useRef(0);

  useEffect(() => () => clearTimeout(revealTimer.current), []);

  const say = (text, kind = 'info') => setStatus({ text, kind });
  const reload = () => {
    const next = safeLoad();
    setBoard(next);
    return next;
  };

  /* ---------------- derived ---------------- */
  const q = query.trim().toLowerCase();
  const matches = row => !q
    || row.key.toLowerCase().includes(q)
    || tagLabel(row).toLowerCase().includes(q)
    || (row.entry?.description || '').toLowerCase().includes(q);
  const rows = useMemo(() => board.rows.filter(matches), [board, q]);
  const targets = board.targets;
  const ri = clamp(r, 0, Math.max(0, rows.length - 1));
  const ci = clamp(c, 0, Math.max(0, targets.length - 1));
  const row = rows[ri];
  const target = targets[ci];
  const entry = row && row.entry;
  const isEmpty = !board.error && board.rows.length === 0;
  const tilde = p => p.replace(process.env.HOME || '\u0000', '~');
  // Import defaults to the cursor's file, or the project .env on an empty board
  const projectEnv = targets.find(t => t.display.startsWith('./') && t.exists);
  const importSource = (isEmpty && projectEnv) || (target && target.exists ? target : projectEnv);
  const importPath = importSource ? importSource.display : './.env';

  const opsFor = t => Object.entries(pending)
    .filter(([k]) => k.startsWith(t.path + '\t'))
    .map(([k, op]) => ({ row: board.rows.find(x => x.id === k.slice(t.path.length + 1)), op }))
    .filter(o => o.row);
  const pendingCount = targets.reduce((n, t) => n + opsFor(t).length, 0);

  /* ---------------- geometry ---------------- */
  const W = Math.max(40, columns - 2);
  const bodyH = Math.max(8, termRows - 6);
  let keyW = clamp(Math.max(0, ...board.rows.map(x => strWidth(x.key))), 10, 28);
  const tagW = clamp(Math.max(0, ...board.rows.map(x => strWidth(tagLabel(x)))), 4, 14);
  const labelW = () => 2 + keyW + 1 + tagW + 1;
  while (W - labelW() < CELL_W + 2 && keyW > 8) keyW--;
  const LW = labelW();
  const visCols = Math.max(1, Math.floor((W - LW - 2) / CELL_W));
  const cOff = scrollWindow(colOff.current, ci, visCols, targets.length);
  colOff.current = cOff;
  const visTargets = targets.slice(cOff, cOff + visCols);
  const panelH = mode === 'form' ? FORM_HEIGHT : PANEL_H;
  const gridH = Math.max(2, bodyH - 2 - panelH);
  const rOff = scrollWindow(rowOff.current, ri, gridH, rows.length);
  rowOff.current = rOff;
  const diffBodyH = bodyH - 2;
  const diffLen = plans ? diffLines(plans).length : 0;

  /* ---------------- actions ---------------- */
  function toggle() {
    if (!row || !target) return;
    const k = pk(target.path, row.id);
    const st = cellState(target, row);
    const next = { ...pending };
    const p = next[k];
    if (p) {
      if (p === 'update') next[k] = 'remove';
      else delete next[k];
      setPending(next);
      return;
    }
    if (st === 'none') {
      if (row.untracked) return;
      next[k] = 'add';
      const rival = board.rows.find(x => !x.untracked && x.key === row.key && x.id !== row.id
        && (target.assigned.has(x.id) || next[pk(target.path, x.id)] === 'add'));
      if (rival) {
        const rk = pk(target.path, rival.id);
        if (next[rk] === 'add') delete next[rk];
        else next[rk] = 'remove';
        say(`${row.key} in ${target.display}: one value per file — ${tagLabel(rival) || 'untagged'} queued out, ${tagLabel(row) || 'untagged'} queued in`, 'warn');
      } else if (target.untracked.includes(row.key)) {
        say(`${row.key} in ${target.display}: replaces the value evk doesn't track`, 'warn');
      }
    } else if (st === 'ok' || st === 'untracked') next[k] = 'remove';
    else if (st === 'stale') next[k] = 'update';
    setPending(next);
  }

  function queueStale() {
    const next = { ...pending };
    let n = 0;
    for (const t of targets) {
      for (const x of board.rows) {
        const k = pk(t.path, x.id);
        if (cellState(t, x) === 'stale' && !next[k]) { next[k] = 'update'; n++; }
      }
    }
    setPending(next);
    say(n ? `queued ${n} stale cell${n > 1 ? 's' : ''} for update · a to preview` : 'nothing is stale', n ? 'info' : 'ok');
  }

  function queueClear() {
    if (!target) return;
    const next = { ...pending };
    let n = 0;
    for (const x of board.rows) {
      const k = pk(target.path, x.id);
      const st = cellState(target, x);
      if (st === 'ok' || st === 'stale' || st === 'untracked') { next[k] = 'remove'; n++; }
      else if (next[k] === 'add') delete next[k];
    }
    setPending(next);
    say(n ? `queued clearing ${target.display} (${n}) · a to preview — the evk block goes, commented lines come back` : `${target.display} holds nothing from evk`, n ? 'info' : 'ok');
  }

  function preview() {
    if (!pendingCount) return say('nothing queued · space on a cell queues a change', 'warn');
    const ps = targets.map(t => planTarget(t, opsFor(t), board.entries)).filter(p => !p.empty);
    if (!ps.length) {
      setPending({});
      return say('the queued changes would not change any file', 'info');
    }
    setStatus(null);
    setPlans(ps);
    setDiffOff(0);
    setMode('diff');
  }

  function write() {
    const done = [];
    const errs = [];
    const commented = [];
    const restored = [];
    for (const p of plans) {
      try {
        const res = applyPlan(p);
        done.push(p.target.display);
        commented.push(...res.commented);
        restored.push(...res.restored);
      } catch (err) {
        errs.push(`${p.target.display}: ${err.message}`);
      }
    }
    setPending({});
    setPlans(null);
    setMode('board');
    reload();
    if (errs.length) return say(`could not write ${errs.join('; ')}`, 'err');
    say(`wrote ${done.join(', ')}`
      + (commented.length ? ` · commented out ${commented.join(', ')} outside the block` : '')
      + (restored.length ? ` · restored ${restored.join(', ')}` : ''), 'ok');
  }

  function openForm(kind) {
    if (kind === 'edit' && entry) setForm(newForm('edit', entry));
    else if (kind === 'edit' && row && row.untracked) {
      const holder = targets.find(t => t.untracked.includes(row.key));
      setForm({ ...newForm('new', null, { key: row.key, value: holder ? holder.blockVars[row.key] : '' }), title: `Track ${row.key} in the store`, focus: 2 });
    } else setForm(newForm('new', null, { key: row ? row.key : '' }));
    setStatus(null);
    setMode('form');
  }

  function saveForm() {
    const f = form.fields;
    const key = f.key.trim();
    const fail = msg => setForm({ ...form, error: msg });
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return fail('key must be letters, digits or _ and cannot start with a digit');
    if (f.value === '') return fail('value is empty');
    const tags = [...new Set(f.tags.split(/[\s,]+/).filter(Boolean))].sort();
    try {
      let saved;
      if (form.mode === 'edit') {
        const clash = board.entries.find(x => x.id !== form.id && x.key === key && (x.tags || []).join(',') === tags.join(','));
        if (clash) return fail(`${entryName({ key, tags })} already exists — edit that one instead`);
        saved = updateVariableById(form.id, { key, value: f.value, tags, description: f.description });
      } else {
        const clash = board.entries.find(x => x.key === key && (x.tags || []).join(',') === tags.join(','));
        if (clash) return fail(`${entryName({ key, tags })} already exists — esc, then e edits it (or give different tags)`);
        saved = addVariable(key, f.value, { tags, description: f.description });
      }
      const existed = board.entries.some(x => x.id === saved.id);
      const nb = reload();
      setQuery('');
      const idx = nb.rows.findIndex(x => x.id === saved.id);
      if (idx >= 0) setR(idx);
      const savedRow = nb.rows[idx];
      const stale = savedRow ? nb.targets.filter(t => cellState(t, savedRow) === 'stale').map(t => t.display) : [];
      setForm(null);
      setMode('board');
      if (stale.length) say(`saved ${entryName(saved)} · now stale in ${stale.join(', ')} — u queues the update`, 'warn');
      else say(`${form.mode === 'edit' || existed ? 'saved' : 'added'} ${entryName(saved)}`, 'ok');
    } catch (err) {
      fail(err.message);
    }
  }

  function doDelete() {
    const where = targets.filter(t => t.assigned.has(entry.id)).map(t => t.display);
    removeVariable(entry.id, { byId: true });
    reload();
    setMode('board');
    say(`deleted ${entryName(entry)}` + (where.length ? ` · still in ${where.join(', ')} as an untracked line until you clear that cell` : ''), where.length ? 'warn' : 'ok');
  }

  function addTarget(raw) {
    const p = raw.trim();
    setMode('board');
    if (!p) return;
    const canon = canonicalPath(p);
    try {
      if (fs.existsSync(expandPath(canon)) && fs.statSync(expandPath(canon)).isDirectory()) {
        return say(`${p} is a directory — give a file path such as ${p.replace(/\/$/, '')}/.env`, 'err');
      }
      const existing = targets.findIndex(t => t.path === canon);
      if (existing >= 0) { setC(existing); return say(`${canon} is already a column`); }
      recordTarget(canon, []);
      const nb = reload();
      setC(nb.targets.findIndex(t => t.path === canon));
      say(`added ${canon} · nothing is written until you queue cells and press a`, 'ok');
    } catch (err) {
      say(err.message, 'err');
    }
  }

  function forgetColumn() {
    if (!target) return;
    if (target.blockVars) return say(`${target.display} still has an evk block — c then a clears it first`, 'warn');
    if (!target.recorded) return say(`${target.display} is a default column`, 'info');
    forgetTarget(target.path);
    reload();
    say(`forgot ${target.display}`, 'ok');
  }

  function reveal() {
    if (!entry) return;
    clearTimeout(revealTimer.current);
    if (revealed === entry.id) { setRevealed(null); return say('hidden'); }
    setRevealed(entry.id);
    say(`showing ${entryName(entry)} · hides again in 5s`, 'warn');
    revealTimer.current = setTimeout(() => { setRevealed(null); setStatus(null); }, 5000);
  }

  function copy() {
    if (!entry) return;
    const ok = copyToClipboard(entry.value);
    say(ok ? `copied ${entryName(entry)} without showing it` : 'could not reach the clipboard', ok ? 'ok' : 'err');
  }

  function quit() {
    if (pendingCount && !quitArmed) {
      setQuitArmed(true);
      return say(`${pendingCount} queued change${pendingCount > 1 ? 's' : ''} not written — q again to quit without writing`, 'warn');
    }
    exit();
  }

  /* ---------------- input ---------------- */
  useInput((input, key) => {
    if (mode === 'import') return;
    if (mode === 'form') {
      if (key.escape) { setMode('board'); setForm(null); say('edit cancelled · nothing changed'); return; }
      if (key.tab || key.downArrow) {
        const step = key.tab && key.shift ? 3 : 1;
        setForm(f => ({ ...f, focus: (f.focus + step) % 4 }));
        return;
      }
      if (key.upArrow) setForm(f => ({ ...f, focus: (f.focus + 3) % 4 }));
      return;
    }
    if (mode === 'search') {
      if (key.escape) { setQuery(''); setMode('board'); }
      else if (key.downArrow) setR(ri + 1);
      else if (key.upArrow) setR(Math.max(0, ri - 1));
      return;
    }
    if (mode === 'addtarget') { if (key.escape) setMode('board'); return; }
    if (mode === 'help') { if (key.escape || input === '?' || input === 'q') setMode('board'); return; }
    if (mode === 'diff') {
      if (key.return) write();
      else if (key.escape) { setMode('board'); setPlans(null); }
      else if (key.downArrow || input === 'j') setDiffOff(o => Math.min(o + 1, Math.max(0, diffLen - diffBodyH + 1)));
      else if (key.upArrow || input === 'k') setDiffOff(o => Math.max(0, o - 1));
      return;
    }
    if (mode === 'confirm') {
      if (input === 'y') doDelete();
      else if (input === 'n' || key.escape) { setMode('board'); say('kept'); }
      return;
    }

    // board
    const ch = input.length === 1 ? input : '';
    if (ch !== 'q' && quitArmed) setQuitArmed(false);
    const nav = key.upArrow || key.downArrow || key.leftArrow || key.rightArrow || (ch && 'hjkl'.includes(ch));
    if (nav) setStatus(null);

    if (key.downArrow || ch === 'j') setR(Math.min(rows.length - 1, ri + 1));
    else if (key.upArrow || ch === 'k') setR(Math.max(0, ri - 1));
    else if (key.rightArrow || ch === 'l') setC(Math.min(targets.length - 1, ci + 1));
    else if (key.leftArrow || ch === 'h') setC(Math.max(0, ci - 1));
    else if (ch === ' ') toggle();
    else if (ch === 'u') queueStale();
    else if (ch === 'c') queueClear();
    else if (ch === 'x') { setPending({}); say('queue dropped · no file was touched'); }
    else if (ch === 'a') preview();
    else if (ch === 'e' || key.return) { if (row) openForm('edit'); }
    else if (ch === 'n') openForm('new');
    else if (ch === 'd') {
      if (entry) setMode('confirm');
      else if (row) say('this line is not in the store · space queues its removal from the file', 'info');
    }
    else if (ch === 'v') reveal();
    else if (ch === 'y') copy();
    else if (ch === '/') setMode('search');
    else if (ch === 'i') { setStatus(null); setMode('import'); }
    else if (ch === 't') { setPathDraft(''); setMode('addtarget'); }
    else if (ch === 'T') forgetColumn();
    else if (ch === '?') { setStatus(null); setMode('help'); }
    else if (ch === 'q') quit();
    else if (key.escape) { if (query) setQuery(''); else quit(); }
  });

  /* ---------------- render: header ---------------- */
  const header = h(Box, { width: W, justifyContent: 'space-between' },
    h(Text, null,
      h(Text, { color: colors.accent, bold: true }, 'evk'),
      h(Text, { color: colors.dim }, ' · ' + ({ diff: 'preview', help: 'help', import: 'import' }[mode] || 'board')),
      h(Text, { color: colors.muted }, `   ${board.entries.length} values · ${targets.length} files`)
    ),
    ['diff', 'help', 'import', 'form'].includes(mode) || isEmpty
      ? h(Text, null, ' ')
      : mode === 'search'
      ? h(Box, null, h(Text, { color: colors.accent }, '/ '), h(TextInput, { value: query, onChange: v => { setQuery(v); setR(0); }, onSubmit: () => setMode('board') }))
      : query
        ? h(Text, null, h(Text, { color: colors.accent }, '/ '), h(Text, null, query), h(Text, { color: colors.muted }, '   esc clears'))
        : h(Text, { color: colors.muted }, '/ filter')
  );

  /* ---------------- render: grid ---------------- */
  function GridHeader() {
    return h(Text, { wrap: 'truncate' },
      h(Text, { color: colors.muted }, fit('', LW - 1) + (cOff > 0 ? '‹' : ' ')),
      ...visTargets.map((t, j) => h(Text, {
        key: t.path,
        bold: cOff + j === ci,
        color: cOff + j === ci ? undefined : colors.dim
      }, center(t.display, CELL_W - 1) + ' ')),
      h(Text, { color: colors.muted }, cOff + visCols < targets.length ? '›' : ' '),
      W - LW - visTargets.length * CELL_W > 14 ? h(Text, { color: colors.muted }, '  t + file') : null
    );
  }

  function GridRow({ x, idx }) {
    const on = idx === ri;
    const bg = on ? colors.selBg : undefined;
    const first = idx === 0 || rows[idx - 1].key !== x.key;
    const tagColor = x.untracked ? colors.muted : x.entry.tags.length ? getTagColor(x.entry.tags[0]) : undefined;
    const pad = Math.floor((CELL_W - 3) / 2);
    const used = LW + visTargets.length * CELL_W;
    return h(Text, { key: x.id, wrap: 'truncate' },
      h(Text, { color: colors.accent, backgroundColor: bg }, on ? `${glyphs.pointer} ` : '  '),
      h(Text, {
        backgroundColor: bg,
        bold: on,
        color: on ? colors.accent : x.untracked ? colors.dim : undefined
      }, fit(first || on ? x.key : '', keyW) + ' '),
      h(Text, { color: tagColor, backgroundColor: bg }, fit(tagLabel(x), tagW) + ' '),
      ...visTargets.map((t, j) => {
        const p = pending[pk(t.path, x.id)];
        const style = p ? PENDING_STYLE[p] : STATE_STYLE[cellState(t, x)];
        const cursor = on && cOff + j === ci;
        return h(Text, { key: t.path },
          h(Text, { backgroundColor: bg }, ' '.repeat(pad)),
          h(Text, {
            color: cursor ? colors.accentFg : colors[style.color],
            backgroundColor: cursor ? colors.accent : bg,
            bold: cursor || !!p
          }, style.glyph),
          h(Text, { backgroundColor: bg }, ' '.repeat(CELL_W - 3 - pad))
        );
      }),
      on ? h(Text, { backgroundColor: bg }, ' '.repeat(Math.max(0, W - used))) : null
    );
  }

  /* ---------------- render: panel ---------------- */
  function QueuedLine() {
    const parts = targets.map(t => {
      const ops = opsFor(t);
      if (!ops.length) return null;
      const n = op => ops.filter(o => o.op === op).length;
      return h(Text, { key: t.path },
        h(Text, { bold: true }, t.display + ' '),
        n('add') ? h(Text, { color: colors.ok }, `+${n('add')} `) : null,
        n('update') ? h(Text, { color: colors.stale }, `~${n('update')} `) : null,
        n('remove') ? h(Text, { color: colors.bad }, `-${n('remove')} `) : null,
        ' '
      );
    }).filter(Boolean);
    if (!parts.length) {
      return h(Text, { color: colors.muted, wrap: 'truncate' }, 'nothing queued · space on a cell queues a change; files are only touched when you press a');
    }
    return h(Text, { wrap: 'truncate' },
      h(Text, { color: colors.accent, bold: true }, 'queued '),
      h(Text, { color: colors.accent }, '→ a to preview & write   '),
      ...parts
    );
  }

  function SelectedLine() {
    if (!row) return h(Text, { color: colors.muted }, q ? `no row matches “${query}”` : ' ');
    if (row.untracked) {
      const files = targets.filter(t => t.untracked.includes(row.key)).map(t => t.display);
      return h(Text, { wrap: 'truncate' },
        h(Text, { bold: true }, row.key),
        h(Text, { color: colors.dim }, ` is in ${files.join(', ')} but not in the store · e tracks it · space queues its removal`)
      );
    }
    const e = row.entry;
    const shown = revealed === e.id ? e.value : maskValue(e.key, e.value);
    return h(Text, { wrap: 'truncate' },
      h(Text, { bold: true }, e.key + ' '),
      e.tags.length ? h(Text, { color: getTagColor(e.tags[0]) }, e.tags.join('+') + '  ') : h(Text, null, ' '),
      h(Text, { color: revealed === e.id ? colors.stale : colors.dim }, shown),
      e.description ? h(Text, { color: colors.muted }, '   ' + e.description) : null
    );
  }

  function ContextLine() {
    if (mode === 'confirm' && entry) {
      const where = targets.filter(t => t.assigned.has(entry.id)).map(t => t.display);
      return h(Text, { wrap: 'truncate' },
        h(Text, { color: colors.bad, bold: true }, `delete ${entryName(entry)} from the store? `),
        h(Text, { color: colors.accent }, 'y'), h(Text, { color: colors.dim }, ' delete  '),
        h(Text, { color: colors.accent }, 'n'), h(Text, { color: colors.dim }, ' keep'),
        where.length ? h(Text, { color: colors.muted }, `   (it stays in ${where.join(', ')} until you clear that cell)`) : null
      );
    }
    if (mode === 'addtarget') {
      return h(Box, null,
        h(Text, { color: colors.accent }, 'add file  '),
        h(TextInput, { value: pathDraft, onChange: setPathDraft, onSubmit: addTarget, placeholder: '~/projects/api/.env' }),
        h(Text, { color: colors.muted }, '   enter add · esc cancel')
      );
    }
    if (!target) return h(Text, null, ' ');
    const held = board.rows.filter(x => ['ok', 'stale'].includes(cellState(target, x))).length;
    const stale = board.rows.filter(x => cellState(target, x) === 'stale').length;
    return h(Text, { wrap: 'truncate', color: colors.muted },
      `${target.display}  ${target.type} · ${held} value${held === 1 ? '' : 's'}`
      + (stale ? ` · ${stale} stale` : '')
      + (target.untracked.length ? ` · ${target.untracked.length} not in store` : '')
      + (!target.exists ? ' · file does not exist yet; writing creates it' : '')
    );
  }

  const legend = h(Text, { color: colors.muted, wrap: 'truncate' },
    `${cells.ok.trim()} current  ${cells.stale.trim()} stale  ${cells.none.trim()} not in file  ${cells.untracked.trim()} not in store   ${cells.add} add  ${cells.remove} remove  ${cells.update} update`);

  /* ---------------- render: body ---------------- */
  let body;
  if (board.error) {
    body = h(Box, { flexDirection: 'column' },
      h(Text, { color: colors.bad }, `${glyphs.err} could not read the store: ${board.error}`),
      h(Text, { color: colors.muted }, getStorePath())
    );
  } else if (mode === 'help') {
    body = h(HelpView);
  } else if (mode === 'diff') {
    body = h(DiffPreview, { plans, offset: diffOff, height: bodyH, width: W });
  } else if (mode === 'import') {
    body = h(ImportPanel, {
      defaultPath: importPath,
      height: bodyH,
      width: W,
      onClose: msg => { setMode('board'); if (msg) { reload(); say(msg.text, msg.kind); } }
    });
  } else if (isEmpty && mode !== 'form') {
    body = h(Box, { flexDirection: 'column' },
      h(Banner, { version }),
      h(Text, null, 'No variables yet.'),
      h(Text, null, ' '),
      h(Text, null, h(Text, { color: colors.accent }, 'n'), h(Text, { color: colors.dim }, '  add your first value')),
      h(Text, null, h(Text, { color: colors.accent }, 'i'), h(Text, { color: colors.dim }, `  import from a file (${importPath})`)),
      h(Text, null, ' '),
      h(Text, { color: colors.muted }, 'Values live in ' + tilde(getStorePath()) + '. Once you have some, each file you write to becomes a column here.')
    );
  } else {
    const visible = rows.slice(rOff, rOff + gridH);
    body = h(Box, { flexDirection: 'column' },
      GridHeader(),
      h(Box, { flexDirection: 'column', height: gridH },
        rows.length === 0
          ? h(Text, { color: colors.muted }, `  no row matches “${query}” · esc clears the filter`)
          : visible.map((x, i) => GridRow({ x, idx: rOff + i }))
      ),
      h(Rule, {
        width: W,
        label: rows.length > gridH
          ? `${rOff > 0 ? '↑ ' : ''}${rOff + 1}–${Math.min(rows.length, rOff + gridH)} of ${rows.length}${rOff + gridH < rows.length ? ' ↓' : ''}`
          : null
      }),
      mode === 'form'
        ? h(EntryForm, {
            form,
            width: W,
            onChange: (field, v) => setForm(f => ({ ...f, fields: { ...f.fields, [field]: v }, error: '' })),
            onSubmit: saveForm
          })
        : h(Box, { flexDirection: 'column' }, QueuedLine(), SelectedLine(), ContextLine(), legend)
    );
  }

  /* ---------------- render: footer ---------------- */
  const hintItems = {
    board: isEmpty
      ? [['n', 'new'], ['i', 'import'], ['?', 'help'], ['q', 'quit']]
      : [['space', 'toggle'], ['a', 'apply'], ['e', 'edit'], ['n', 'new'], ['u', 'stale'], ['c', 'clear file'], ['x', 'drop'], ['v', 'show'], ['y', 'copy'], ['/', 'filter'], ['d', 'delete'], ['i', 'import'], ['t', 'add file']],
    search: [['enter', 'keep filter'], ['esc', 'clear'], ['↑↓', 'move']],
    form: [['tab', 'next field'], ['enter', 'save'], ['esc', 'cancel']],
    diff: [['enter', 'write all'], ['↑↓', 'scroll'], ['esc', 'back to board']],
    help: [['esc', 'close']],
    confirm: [['y', 'delete'], ['n', 'keep']],
    addtarget: [['enter', 'add column'], ['esc', 'cancel']],
    import: [['space', 'select'], ['enter', 'import'], ['p', 'other file'], ['t', 'tags'], ['esc', 'back']]
  }[mode];

  const STATUS_STYLE = {
    ok: [glyphs.ok, colors.ok],
    warn: [glyphs.warn, colors.stale],
    err: [glyphs.err, colors.bad],
    info: [glyphs.info, colors.dim]
  };
  const statusLine = status
    ? h(Text, { color: STATUS_STYLE[status.kind][1], wrap: 'truncate' }, `${STATUS_STYLE[status.kind][0]} ${status.text}`)
    : h(Text, { color: colors.muted, wrap: 'truncate' }, `${tilde(getStorePath())} · ${board.entries.length} values`);

  return h(Box, { flexDirection: 'column', paddingX: 1 },
    header,
    h(Rule, { width: W }),
    h(Box, { flexDirection: 'column', height: bodyH }, body),
    h(Rule, { width: W }),
    h(Hints, { items: hintItems, pinned: mode === 'board' && !isEmpty ? [['?', 'help'], ['q', 'quit']] : [], width: W }),
    statusLine
  );
}
