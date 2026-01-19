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

**evk** is a local-first environment variable manager CLI built with Node.js (ESM modules). Variables are stored in `~/.evk/store.yaml`.

### Core Components

- **bin/evk.js** - CLI entry point using Commander.js. Default action launches the TUI; subcommands (`add`, `list`, `sync`, etc.) are defined here
- **src/core/store.js** - YAML store operations (`~/.evk/store.yaml`). Handles reading/writing with 0600 permissions for security
- **src/core/sync.js** - Syncs variables to target files (shell configs, .env). Manages "evk Managed Block" markers and handles conflict detection by commenting out existing variables
- **src/utils/parser.js** - Block parsing/generation. Defines `BLOCK_START`/`BLOCK_END` markers, detects file types (shell vs dotenv), formats export statements
- **src/utils/file.js** - Safe file I/O with `~` expansion

### TUI (Terminal UI)

Built with React + Ink. Located in `src/tui/`:
- **App.js** - Main app with view state management (MENU, LIST, ADD, SYNC, DETAIL, CLEAN)
- **views/** - Individual view components (MainMenu, ListView, AddView, SyncView, DetailView, CleanView)

Uses `React.createElement` directly (aliased as `h`) rather than JSX.

### Key Patterns

- **Managed Block** - When syncing, evk creates/updates a marked block in target files. Variables outside this block that conflict are commented with `# [evk] Commented out due to conflict:`
- **Two file types** - `shell` (uses `export KEY="value"`) and `dotenv` (uses `KEY=value`). Auto-detected from path
- **Tests use ESM mocking** - Tests use `jest.unstable_mockModule` for mocking ES modules, with dynamic imports after mock setup
