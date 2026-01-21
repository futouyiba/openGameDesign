# VS Code UI Tests (Workbench)

This suite runs Workbench UI automation using WebdriverIO + wdio-vscode-service.

## Run

```bash
npm run test:ui
```

Optional env vars:

- `VSCODE_UI_VERSION=stable|insiders|1.xx`
- `WDIO_LOG_LEVEL=debug|info|warn`

## Artifacts

Artifacts are written to:

```
gdd-vscode/artifacts/vscode-ui/<runId>/
```

Contents include:

- `steps.json`
- `screenshots/`
- `logs/`
- `ui-dump/`

## Notes

- On Linux CI, run with Xvfb.
- If tests fail, inspect `ui-dump/` and the last screenshot.
