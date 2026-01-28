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
│   │   ├── clean.js     # Clean managed blocks
│   │   ├── export.js    # Export for eval
│   │   └── purge.js     # Delete all evk data
│   ├── core/
│   │   ├── store.js     # YAML store operations
│   │   └── sync.js      # Sync logic with conflict detection
│   ├── tui/
│   │   ├── index.js     # TUI entry point (startTUI)
│   │   ├── App.js       # Main app with view state management
│   │   └── views/       # View components
│   └── utils/
│       ├── file.js      # Safe file I/O with ~ expansion
│       ├── parser.js    # Block parsing/generation
│       └── logger.js    # Colored console output helpers
└── tests/               # Jest test files
```

### Core Components

- **bin/evk.js** - CLI entry point using Commander.js. Default action launches the TUI; subcommands (`add`, `list`, `sync`, etc.) are defined here
- **src/commands/** - Individual command implementations, each exporting a handler function
- **src/core/store.js** - YAML store operations (`~/.evk/store.yaml`). Handles reading/writing with 0600 permissions for security
- **src/core/sync.js** - Syncs variables to target files (shell configs, .env). Manages "evk Managed Block" markers and handles conflict detection by commenting out existing variables
- **src/utils/parser.js** - Block parsing/generation. Defines `BLOCK_START`/`BLOCK_END` markers, detects file types (shell/fish vs dotenv), formats export statements
- **src/utils/file.js** - Safe file I/O with `~` expansion
- **src/utils/logger.js** - Console output helpers with chalk (success, error, warn, info, dim)

### TUI (Terminal UI)

Built with React + Ink. Located in `src/tui/`:

- **index.js** - Entry point, exports `startTUI()` function
- **App.js** - Main app with view state management (MENU, LIST, ADD, SYNC, DETAIL, CLEAN)
- **views/** - Individual view components (MainMenu, ListView, AddView, SyncView, DetailView, CleanView)

Uses `React.createElement` directly (aliased as `h`) rather than JSX.

### Key Patterns

- **Managed Block** - When syncing, evk creates/updates a marked block in target files. Variables outside this block that conflict are commented with `# [evk] Commented out due to conflict:`
- **Three file types** - `shell` (uses `export KEY="value"`), `fish` (uses `set -gx KEY "value"`), and `dotenv` (uses `KEY=value`). Auto-detected from path
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
