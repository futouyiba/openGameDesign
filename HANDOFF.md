# Handoff Notes

## LSP diagnostics (TypeScript)

- Installed globally:
  - `npm install -g typescript-language-server typescript`
- Added repo config:
  - `opencode.json` with a custom `lsp.typescript.command` pointing to
    `C:\Users\futou\AppData\Roaming\npm\typescript-language-server.cmd`.
- Added local shim:
  - `typescript-language-server.cmd` in repo root pointing to the same global cmd.
- Current OpenCode process did not reload PATH/config yet, so it still reports:
  - `typescript [not installed]` in `lsp_servers`
  - `Command not found: typescript-language-server` in `lsp_diagnostics`
- Action after restart:
  - Restart OpenCode process, then run:
    - `lsp_servers`
    - `lsp_diagnostics E:\DocsHDD\openGameDesign\gdd-vscode\src\extension.ts`

## VS Code extension tests

- `npm test` in `gdd-vscode` fails at compile step:
  - `TS6059` because `gdd-vscode/tests/ui/**` is outside `rootDir` (`src`).
- Fix option:
  - Update `gdd-vscode/tsconfig.json` to exclude `tests/` or set `include` to `src/**/*`.

## Current local changes

- New files:
  - `opencode.json`
  - `typescript-language-server.cmd`
  - `HANDOFF.md`
- Existing local changes preserved:
  - `gdd-vscode/src/llm/auth.ts` modified
  - Untracked file `C` in repo root (typescript-language-server wrapper)
