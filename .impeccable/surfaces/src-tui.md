---
version: 1
slug: "src-tui"
primary_target: "src/tui"
related_targets: []
---

# Surface: evk TUI (Operate)

Scope: the whole interactive TUI (`evk` / `evk ui`). Visitor mode: Operate. A solo developer with a few dozen keys opens it for seconds: check, add or edit a value, push values into ~/.zshrc, ~/.bashrc or a project .env, or clean one up.

## Direction contract

THESIS: Syncing is declared, not executed. The TUI is one board: values (rows) × target files (columns). Toggling a cell only queues a change, and `a` writes every queued change after one combined diff. It refuses the menu → screen → Esc hub and the one-off "sync wizard".

OWN-WORLD: Terminal-native and restrained. Use the terminal's own background, one amber accent reserved for the cursor and actionable keys, and state colours only where they mean something: green ● current, amber ◐ store changed since write, red for removals and errors. Tags take muted hues. Use rules (─), not nested rounded boxes. Hierarchy comes from bold and dim. Every state has a glyph so it never relies on colour alone.

STORY: At a glance the developer sees which value lives in which file and what is stale. They queue changes cell by cell (one value per key per file is enforced automatically), review a masked diff, and write. Edits happen in place in a single form.

FIRST VIEWPORT: Line 1 is `evk · board` with counts on the left and a filter on the right. Then the column header of target paths (cursor column bold). Then the matrix: key (shown once per group), tag, and one centred cell glyph per target, with the cursor cell inverse-amber. Below a rule sits the info panel: the queued summary per file with "→ a to preview & write", the selected value (masked) with its note, and a legend. Then the hint line and a persistent status line.

FORM: Grounded candidate "hotel key board", ranked first on my list (IMPECCABLE'S PICK). seed:6783160ef2d50dd3

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: queued cells ([+] [−] [~]) persist until `a` (apply with diff) or `x` (drop). Queuing a second tag of a key into a file auto-queues the first one out.

Decision reference: .impeccable/mocks/tui-directions/index.html (direction B)
