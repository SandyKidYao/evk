# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
# Run all tests (requires --experimental-vm-modules for ESM support)
npm test

# Run tests with coverage
npm run test:coverage

# Run a single test file
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/store.test.js

# Run the CLI locally during development
node bin/evk.js
```

## Architecture

**evk** is a local-first environment variable keeper CLI built with Node.js (ESM modules). Variables are stored in `~/.evk/store.yaml`.

### Project Structure

```text
evk/
├── bin/evk.js           # CLI entry point
├── src/
│   ├── commands/        # CLI command implementations
│   │   ├── add.js       # Add/update variables
│   │   ├── list.js      # List variables
│   │   ├── remove.js    # Remove variables
│   │   ├── show.js      # Show/get variable details
│   │   ├── sync.js      # Sync to target files
│   │   ├── import.js    # Import from files
│   │   ├── clean.js     # Clean managed blocks
│   │   ├── export.js    # Export for eval
│   │   └── purge.js     # Delete all evk data
│   ├── core/
│   │   ├── store.js     # YAML store operations
│   │   ├── sync.js      # Sync logic with conflict detection (syncToFile merges, writeBlock replaces)
│   │   ├── board.js     # Board model: values × target files, cell states, plans, target records
│   │   └── import.js    # Import logic (parse file, detect conflicts)
│   ├── tui/
│   │   ├── index.js     # TUI entry point (startTUI)
│   │   ├── App.js       # The board: state, input handling, grid + info panel rendering
│   │   ├── theme.js     # Palette, tag colours, cell glyphs
│   │   ├── layout.js    # Width-aware fit/center/scroll helpers
│   │   ├── hooks/       # useTerminalSize (re-render on terminal resize)
│   │   ├── components/  # Banner (empty store only), EntryForm, DiffPreview
│   │   └── views/       # HelpView, ImportPanel
│   └── utils/
│       ├── file.js      # Safe file I/O with ~ expansion
│       ├── parser.js    # Block parsing/generation
│       ├── mask.js      # Secret masking for display
│       ├── clipboard.js # Copy without printing (pbcopy/clip/wl-copy/xclip, OSC 52 fallback)
│       └── logger.js    # Colored console output helpers
└── tests/               # Jest test files
```

### Core Components

- **bin/evk.js** - CLI entry point using Commander.js. Default action launches the TUI; subcommands (`add`, `list`, `sync`, etc.) are defined here
- **src/commands/** - Individual command implementations, each exporting a handler function
- **src/core/store.js** - YAML store operations (`~/.evk/store.yaml`). Handles reading/writing with 0600 permissions for security
- **src/core/sync.js** - Syncs variables to target files (shell configs, .env). Manages "evk Managed Block" markers and handles conflict detection by commenting out existing variables
- **src/core/import.js** - Imports variables from files (.env, shell configs) into the store. Parses file content, detects conflicts with existing store entries, and executes batch imports
- **src/utils/parser.js** - Block parsing/generation. Defines `BLOCK_START`/`BLOCK_END` markers, detects file types (shell vs dotenv), formats export statements
- **src/utils/file.js** - Safe file I/O with `~` expansion
- **src/utils/logger.js** - Console output helpers with chalk (success, error, warn, info, dim)

### TUI (Terminal UI)

Built with React + Ink. Located in `src/tui/`. There is no menu: `evk` opens straight into **the board** (rows = store entries, columns = target files).

- **App.js** - Holds the board (`loadBoard()`), cursor, the pending queue (`{ "<targetPath>\t<rowId>": 'add'|'remove'|'update' }`) and a `mode` (board, search, form, diff, help, addtarget, confirm, import). Toggling a cell only queues; `a` builds plans with `planTarget()` and shows `DiffPreview`; Enter runs `applyPlan()` per file
- **components/EntryForm.js** - One form for add and edit (key, value, tags, description); Tab moves, Enter saves
- **components/DiffPreview.js** - Masked, scrollable preview of every file a write will touch
- **views/ImportPanel.js** - Checklist import of variables found *outside* a file's managed block
- **views/HelpView.js** - Key and glyph reference (`?`)
- **theme.js** - Main text uses the terminal foreground; amber accent only for cursor and actionable keys; state colours (ok / stale / bad) always paired with a glyph
- **layout.js** - `fit`, `fitLeft`, `center`, `strWidth`, `scrollWindow` for the fixed character grid

Uses `React.createElement` directly (aliased as `h`) rather than JSX. Grid geometry (key/tag widths, visible columns, grid height) is derived from `useTerminalSize`; columns scroll horizontally when they do not fit.

### Board model (`src/core/board.js`)

- `store.targets[<path>].entries` records which entry ids a file holds. Paths are canonical: `~/…` under home, absolute elsewhere (`canonicalPath`); `displayPath` shows `./.env` for the current directory
- Cell state compares that record with the file's actual managed block: assigned + same value = `ok`, assigned + different/missing = `stale`, unassigned = `none`; block keys not owned by any entry are `untracked` rows
- Files without a record (written by older versions) are inferred by key + value (`inferAssigned`)
- `planTarget` changes only queued cells; everything else in the block is kept as written. One value per key per file
- CLI `sync` calls `recordSync`, CLI `clean` calls `recordClean`, so the CLI and the board share one model

### Data Structure (v2)

Store file (`~/.evk/store.yaml`) uses array-based structure:

```yaml
version: 2
vars:
  - id: "uuid-1"
    key: API_KEY
    value: "dev-key"
    tags: [dev]
    description: ""
    created_at: "2024-01-01T00:00:00.000Z"
    updated_at: "2024-01-01T00:00:00.000Z"
  - id: "uuid-2"
    key: API_KEY
    value: "prod-key"
    tags: [prod]
    description: ""
    created_at: "2024-01-01T00:00:00.000Z"
    updated_at: "2024-01-01T00:00:00.000Z"
targets:                      # which entries each file holds (board + CLI sync/clean)
  "~/.zshrc":
    entries: ["uuid-1"]
  "~/projects/api/.env":
    entries: []
```

Key design decisions:

- **Same key, different tags** - Allows same variable name with different values for different tags (e.g., dev/prod)
- **UUID identification** - Each entry has a unique `id` for TUI selection and deletion
- **Update logic** - `key + tags (sorted)` exact match = update, otherwise create new entry
- **Sync conflict resolution** - `flattenVariables(vars, tagPriority)` - later tags in priority list override earlier ones

### Key Patterns

- **Managed Block** - When syncing, evk creates/updates a marked block in target files. Variables outside this block that conflict are commented with `# [evk] Commented out due to conflict:`
- **Two file types** - `shell` (uses `export KEY="value"`) and `dotenv` (uses `KEY=value`). Auto-detected from path
- **Tests use ESM mocking** - Tests use `jest.unstable_mockModule` for mocking ES modules, with dynamic imports after mock setup

## Commit Checklist

Before committing code, verify the following documentation is up to date:

1. **README.md** - Check if any of these need updates:
   - New CLI commands or options added
   - Changed command syntax or behavior
   - New features that users should know about
   - Installation or usage instructions

2. **CLAUDE.md** - Check if any of these need updates:
   - New files or directories added to the project structure
   - Architecture changes or new components
   - New patterns or conventions introduced
   - Build/test commands changed
