---
name: evk
description: Local-first environment variable keeper; one terminal board of values × target files.
colors:
  accent-dark: "#F0C674"
  accent-fg-dark: "#15171A"
  ok-dark: "#98C379"
  stale-dark: "#E5A54B"
  bad-dark: "#EF7B72"
  dim-dark: "#A3A8B0"
  muted-dark: "#7F858E"
  rule-dark: "#3A3F46"
  sel-bg-dark: "#262A31"
  tag-dev-dark: "#86B6E0"
  tag-staging-dark: "#BFA6E6"
  tag-prod-dark: "#E0A487"
  tag-cycle-1-dark: "#A9C2A0"
  tag-cycle-2-dark: "#D7B98A"
  tag-cycle-3-dark: "#9FC3C9"
  tag-cycle-4-dark: "#C9A9C2"
  accent-light: "#8A5A00"
  accent-fg-light: "#F8F6F1"
  ok-light: "#2D7A31"
  stale-light: "#B4470F"
  bad-light: "#B3261E"
  dim-light: "#4F555D"
  muted-light: "#6B7179"
  rule-light: "#C9C3B6"
  sel-bg-light: "#E8E2D4"
  tag-dev-light: "#1F5F99"
  tag-staging-light: "#6A3FB0"
  tag-prod-light: "#A3461C"
  tag-cycle-1-light: "#3F6B34"
  tag-cycle-2-light: "#7A5A12"
  tag-cycle-3-light: "#1F6B73"
  tag-cycle-4-light: "#7A3F6B"
spacing:
  pad-x: "1ch"
  pointer-gutter: "2ch"
  cell-width: "12ch"
  cell-glyph: "3ch"
  key-width-min: "10ch"
  key-width-max: "28ch"
  key-width-floor: "8ch"
  tag-width-min: "4ch"
  tag-width-max: "14ch"
  form-label: "14ch"
  help-key-column: "16ch"
  min-width: "40ch"
  panel-height: "4lh"
  form-height: "7lh"
  body-min-height: "8lh"
components:
  cell-cursor-dark:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.accent-fg-dark}"
    width: "{spacing.cell-glyph}"
  cell-cursor-light:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.accent-fg-light}"
    width: "{spacing.cell-glyph}"
  row-selected-dark:
    backgroundColor: "{colors.sel-bg-dark}"
    textColor: "{colors.accent-dark}"
  row-selected-light:
    backgroundColor: "{colors.sel-bg-light}"
    textColor: "{colors.accent-light}"
  board-cell:
    width: "{spacing.cell-width}"
  info-panel:
    height: "{spacing.panel-height}"
  entry-form:
    height: "{spacing.form-height}"
  hint-key-dark:
    textColor: "{colors.accent-dark}"
  hint-key-light:
    textColor: "{colors.accent-light}"
  rule-dark:
    textColor: "{colors.rule-dark}"
  rule-light:
    textColor: "{colors.rule-light}"
---

# Design System: evk

## Overview

**Creative North Star: "The Hotel Key Board"**

evk's TUI is one board, like the key rack behind a hotel desk: values are rows, target files are columns, and each cell tells you at a glance whether that key hangs on that hook. Nothing is moved by looking. You queue changes cell by cell, read one combined, masked diff, and only `a` then Enter writes. The board stays put; modes (filter, form, diff, help, import, confirm, add file) swap the body or the info panel, never stack screens.

The world is terminal-native and restrained. evk draws on the user's own terminal background and prints main text in the terminal's own foreground (the `text` colour is deliberately `undefined`), so it sits inside whatever theme the developer already uses. One amber accent marks the cursor and the keys you can press. State colours (green, amber, red) appear only where they mean something, and every state also has a glyph. Structure comes from horizontal rules and from bold and dim, not from boxes.

There are no fonts, CSS, radii or shadows here: the platform is a character grid, and the terminal owns the typeface, size and background. The tokens are hex colours for two schemes, a glyph vocabulary, column/line geometry, an interaction grammar and a copy voice.

**Key Characteristics:**
- One board: values (rows) × target files (columns), with no menu hub.
- Queue, then apply: cells only queue; `a` previews one combined diff; Enter writes.
- Terminal foreground for main text; one amber accent; state colour always paired with a glyph.
- Rules (`─`), never nested boxes; hierarchy by bold, dim and muted.
- Secrets masked by default, revealed for 5 s on request.
- Lowercase, consequence-first copy in a persistent status line.

## Colors

Two parallel palettes, dark (default) and light, picked by `EVK_COLOR_SCHEME=light|dark`, else `COLORFGBG` (background index < 8 means dark), else dark. Every role exists in both; the `-dark` / `-light` suffix in the tokens is the scheme, not a variant to mix.

### Primary
- **Desk Amber** (`accent-dark` / `accent-light`): the cursor cell background, the `›` pointer, the selected row's key, the `evk` wordmark in the header, the keys in the hint line, the "queued → a to preview & write" call to action, focused form labels, `/` in the filter, `[x]` import checkboxes, and the first-run banner. Nothing else.
- **Ink on Amber** (`accent-fg-dark` / `accent-fg-light`): the glyph inside the cursor cell, printed on Desk Amber.

### Secondary (state)
- **Current Green** (`ok-*`): `●` written & current, `[+]` queued add, `+` diff lines, `↺` restored lines, `✓` status messages, `+N` in the queued summary, "new" in import.
- **Stale Amber** (`stale-*`): `◐` store changed since write, `[~]` queued update, `#` lines to be commented out in the diff, `!` warning status, a value while it is revealed, "new value" / "overwrites the store value" in import.
- **Removal Red** (`bad-*`): `[-]` queued remove, `-` diff lines, `✗` errors, the delete confirmation prompt, form validation errors.

### Tertiary (tags)
- **Tag hues** (`tag-dev-*`, `tag-staging-*`, `tag-prod-*`): fixed hues for the known environments; `development`, `production` and `stage` alias to them. A row's tag label is coloured by its first tag.
- **Tag cycle** (`tag-cycle-1..4-*`): any other tag hashes into this four-hue muted cycle, so a tag always gets the same colour.

### Neutral
- **Terminal Foreground** (no hex, `color: undefined`): keys, values in the form, titles, column header of the cursor column. Deliberately not a token: the user's terminal decides it.
- **Dim** (`dim-*`): secondary text: the masked value, hint labels, the non-cursor column headers, the mode name after `evk ·`, untracked keys, diff summaries.
- **Muted** (`muted-*`): the quietest readable layer: counts, legend, `·` empty cells, the `/ filter` affordance, the default status line, placeholder text, rule labels, overflow markers `‹ ›`.
- **Rule** (`rule-*`): the `─` horizontal rules only.
- **Selection** (`sel-bg-*`): background of the selected row (grid and import list), full width.

### Named Rules
**The Your-Terminal Rule.** Main text is the terminal's own foreground and the background is never painted, except the selected row and the cursor cell. Do not assign a hex to body text.

**The One Amber Rule.** Desk Amber marks only where the cursor is and what you can press. Status and meaning use the state colours, never the accent.

**The Glyph-First Rule.** Every state carries a glyph (`●` `◐` `·` `○` `[+]` `[-]` `[~]` `✓` `!` `✗`) so it reads without colour; colour only reinforces it.

## Typography

No fonts are specified or loaded: the terminal's monospace face, size and line height are the user's. The only type controls are **bold**, **colour** (foreground, dim, muted) and **inverse-on-amber**; there is no italic, underline or size change.

### Hierarchy
- **Wordmark** (bold, Desk Amber): `evk` at the start of line 1.
- **Title** (bold, foreground): "Keys", "Cells", "Write 2 files", "Import", "New variable", "Edit KEY [tags]".
- **Emphasis** (bold): the cursor row's key, the cursor column's header, a target path in the queued summary, a file path heading each diff block, any queued or cursor cell glyph.
- **Body** (regular, foreground): keys, form values, help descriptions.
- **Secondary** (regular, Dim): values (masked), hint labels, column headers not under the cursor.
- **Label** (regular, Muted): legend, counts, placeholders, rule labels, the idle status line.

### Named Rules
**The Bold-and-Dim Rule.** Hierarchy is made with weight and the three neutral levels only; never with boxes, underlines or extra colour.

## Layout

The screen is a fixed line anatomy inside `paddingX: 1`, with content width `W = max(40, columns − 2)`:

1. **Header**: `evk · <mode>` and `N values · M files` on the left; `/ filter` (or the active filter, or the live search input) on the right.
2. **Rule** `─`.
3. **Body** (`bodyH = max(8, rows − 6)` lines). On the board:
   - **Column header**: target paths centred in each cell, truncated from the left (`…/api/.env`) so the file name survives; cursor column bold, others dim; `‹` / `›` when columns scroll off; `t + file` when more than 14 columns of space remain.
   - **Grid**: per row a 2-column pointer gutter (`› ` or two spaces), the key (shown only on the first row of its key group, or on the cursor row), the tag label, then one 3-column glyph centred in each 12-column cell (4 spaces before, 5 after).
   - **Rule** with a row-position label on the right when rows scroll: `↑ 13–24 of 40 ↓`.
   - **Info panel** (4 lines): queued summary per file; selected value (masked) with tags and note; context for the cursor column (`type · N values · N stale · N not in store`) or the delete / add-file prompt; the legend. In form mode the panel becomes the 7-line entry form and the grid shrinks to fit.
4. **Rule** `─`.
5. **Hint line**: priority-ordered key hints.
6. **Status line**: the last message, or the store path and value count when idle.

Geometry: key width is the longest key clamped to 10–28 columns; tag width the longest tag label clamped to 4–14. If one 12-column cell would not fit, key width shrinks down to 8. Visible columns = `floor((W − labelWidth − 2) / 12)`; columns and rows scroll to keep the cursor in view. Diff, help and import replace the whole body; the header, rules, hints and status stay.

### Named Rules
**The Board-Stays Rule.** Modes swap the body or the info panel in place; the header, the two rules, the hint line and the status line never move.

**The Fixed-Cell Rule.** Every cell is 12 columns with a 3-column glyph, so the grid stays aligned whatever the state. Truncate text with `…`; never let it push a column.

## Elevation & Depth

Flat. There is no depth: no shadows, no overlays, no stacked panels. Layering is expressed by position (body above the panel, panel above hints) and by the two painted backgrounds the system allows: the selected row (`sel-bg`) and the cursor cell (Desk Amber).

## Shapes

The only line element is the horizontal rule `─` in the Rule colour, across the full content width, optionally carrying a right-aligned muted label followed by three more `─`. There are no boxes, borders, vertical rules or corners. Bracketed glyphs (`[+]` `[-]` `[~]`, import `[x]` `[ ]`) are the only enclosed shapes, and they are text.

## Components

### Board cell
The signature component. A 12-column slot with one centred 3-column glyph.
- **At rest:** `●` current (Current Green), `◐` stale (Stale Amber), `·` not in file (Muted), `○` in the file's evk block but not in the store (Dim).
- **Queued:** `[+]` add (green), `[-]` remove (red), `[~]` update (amber), bold. Queued marks persist until `a` writes or `x` drops them.
- **Cursor:** the glyph inverse on Desk Amber, bold.
- **Toggle cycle (space):** empty → `[+]`; current or untracked → `[-]`; stale → `[~]` → `[-]` → back to state; any queued mark toggles off.

### Selected row
Full-width Selection background, `›` pointer and bold key in Desk Amber. The key name repeats on the selected row even inside a group.

### Info panel
Four lines under the grid. Line 1: "nothing queued · space on a cell queues a change; files are only touched when you press a" in Muted, or bold amber `queued` + `→ a to preview & write` and, per file, the bold path with `+N ~N -N` in state colours. Line 2: key (bold), tags (first tag's colour), masked value (Dim, or Stale Amber while revealed), description (Muted). Line 3: column context or an inline prompt. Line 4: the legend.

### Hint line
`key label` pairs: key in Desk Amber, label in Dim, two spaces between pairs. Pairs are in priority order and whole pairs drop off the end when the line is full; `? help` and `q quit` are pinned on the board. Each mode has its own set.

### Status line
One line, always present. `✓` ok (green), `!` warn (Stale Amber), `✗` err (red), `·` info (Dim), followed by lowercase text. Idle: `~/.evk/store.yaml · N values` in Muted. A message stays until you move the cursor or another message replaces it.

### Entry form (inputs)
One form for add, edit and "track this untracked line". Bold title, then four fields always visible (key, value, tags, description) with a 14-column label. The focused label is `› field` in bold Desk Amber and holds a live text input; unfocused labels are Dim. The value is masked except while its field has focus, and the footer line says so: "the value shows in clear only while this field has focus". Errors replace that line in red with `✗`. Tab / ↓ next, Shift-Tab / ↑ previous, Enter saves, Esc cancels.

### Diff preview
Replaces the body after `a`. Bold "Write N files" plus a one-line consequence: Dim "only evk's managed block changes; the rest of each file stays as it is", or Stale Amber when lines outside the block will be commented out or restored. Per file: bold path plus a Dim summary (`+N ~N -N`, "adds evk block", "creates file", "removes evk block"), then lines in file syntax with values masked: `+` green, `-` red (an update is `-` then `+`), `#` amber for commented-out conflicts, `↺` green for restored lines, each with a muted reason. Scroll with ↑↓ / j k; "… N more lines · ↓ to scroll" in Muted.

### Import panel
A checklist that replaces the body: `from` and `as tags` fields (8-column labels, `p` / `t` to change), then rows of pointer, `[x]` / `[ ]` (amber when selected, muted when not; blank for values already in the store), key (22 columns), masked value (24 columns), and a coloured note: "new", "new value", "overwrites the store value", "already in the store". New keys are preselected.

### Help
Two sections, bold "Keys" and "Cells": keys in Desk Amber in a 16-column column with plain descriptions, the cell glyphs in their state colours, and a closing muted line: "Nothing touches a file until you press a and confirm the preview."

### First-run banner
Only on an empty store: the block-letter `EVK` in Desk Amber, "Environment Variable Keeper" in Dim and the version in Muted, then "No variables yet." and the two ways in (`n`, `i`). It never shows once values exist.

### Interaction grammar
- **Queue, then apply.** Cells, `u` (queue every stale cell) and `c` (queue clearing a whole file) only queue. `a` shows the combined diff; Enter writes every file; `x` drops the queue.
- **One value per key per file.** Queuing a second tag's value of a key into a file automatically queues the first one out, and the status line says so.
- **Masked by default.** Secret-looking keys (KEY, TOKEN, SECRET, URL, DSN, …) show a known prefix plus the last 4 characters (`ghp_••••••••Uk2Q`), URLs keep scheme and host and hide credentials, token-like path segments and the query; short values show `••••••••`. `v` reveals for 5 s, `y` copies without showing.
- **Esc goes back one step.** Form: cancel ("edit cancelled · nothing changed"). Filter: clear. Diff: back to the board with the queue kept. Confirm: keep. Help / import: close. Board: clear the filter if any, else quit.
- **Quit guards the queue.** With anything queued, the first `q` warns and only a second `q` quits without writing.

### Copy voice
Status and hint text is lowercase, uses ` · ` as the separator and an em dash before the consequence, and says what will or will not happen to a file: "queue dropped · no file was touched", "added ~/x/.env · nothing is written until you queue cells and press a", "deleted KEY · still in ./.env as an untracked line until you clear that cell". Titles and the empty state use sentence case ("New variable", "No variables yet.").

## Do's and Don'ts

### Do:
- **Do** leave main text on the terminal foreground and the background unpainted, except the selected row (`sel-bg`) and the cursor cell (Desk Amber).
- **Do** pair every state colour with its glyph: `●` `◐` `·` `○` `[+]` `[-]` `[~]` in cells, `✓` `!` `✗` `·` in the status line.
- **Do** keep cells 12 columns with a 3-column centred glyph, and truncate with `…` (keep the start of keys and values, the end of paths).
- **Do** route every file write through the queue and the combined, masked diff; state the consequence in the status line afterwards.
- **Do** define every new colour in both the dark and light palettes.
- **Do** separate regions with full-width `─` rules and order meaning with bold, Dim and Muted.

### Don't:
- **Don't** use Desk Amber for status or meaning; it belongs to the cursor and the keys you can press.
- **Don't** draw boxes, borders or nested panels; the board uses rules only.
- **Don't** show a secret value in clear outside a 5-second reveal or a focused value field.
- **Don't** write to a file directly from a keypress on the board; cells only queue.
- **Don't** add a menu screen or a separate sync wizard; new work is a mode of the one board.
- **Don't** let a hint wrap; drop whole hints from the end and keep `? help` and `q quit`.
