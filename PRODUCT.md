# Product

<!-- impeccable:product-schema 1 -->

## Platform

Terminal (Node.js CLI + Ink/React TUI). Not web, not native mobile.

## Users

Individual developers who keep a few dozen secrets and config values (API keys, tokens, endpoints) on their own machine. They open the TUI occasionally to add a key, check a value, or push variables into a shell rc or project `.env`. It is a low-frequency tool: each session should take seconds.

## Product Purpose

evk is the single local source of truth for a developer's environment variables. It stores them in `~/.evk/store.yaml` and writes them into target files (shell configs, `.env`) without destroying what is already there. Success means the developer never hand-edits `export` lines again and always knows which value is live where.

## Positioning

Local-first, with no account and no server. Writes are non-destructive: evk owns only a marked "Managed Block" in each target file, comments out conflicting lines outside the block, and restores them on clean. One key can hold several values distinguished by tags (for example dev and prod).

## Operating Context

- Used inside the developer's own terminal, usually dark-themed. Light terminals are supported via COLORFGBG / EVK_COLOR_SCHEME.
- Targets: `~/.zshrc`, `~/.bashrc`, `./.env`, custom paths.
- Scriptable CLI subcommands (`add`, `list`, `get`, `sync`, `import`, `clean`, `export`, `purge`) coexist with the TUI. `evk` with no args launches the TUI.

## Capabilities and Constraints

- Store v2: array of entries `{id, key, value, tags[], description, created_at, updated_at}`. Update rule: same key plus the same sorted tags means update, otherwise create a new entry.
- Sync flattens by tag priority (later tags win), writes the managed block, and comments out conflicts.
- Import parses `.env` or shell files, detects conflicts with the store, and lets the user choose overwrite or skip per key.
- Clean removes managed blocks and restores the commented-out originals.
- Redesign scope (confirmed): both the TUI and its interaction model may be restructured. CLI subcommands must stay backward compatible.
- Scale: tens of variables, typically. The design must stay usable at roughly 100.

## Product Principles

1. Seconds, not sessions: any common task is at most a few keystrokes from launch.
2. Secrets are treated as secrets. Values are masked by default and revealed deliberately.
3. Show the truth of the system: what is stored, and where each value is (or is not) synced.
4. Never surprise a file. Every write is previewed, scoped to the managed block, and reversible.
5. The TUI and CLI share one mental model.

## Accessibility & Inclusion

Must remain legible on both dark and light terminals and on semi-transparent backgrounds. Do not rely on color alone for state. Must be fully keyboard driven.
