import fs from 'fs';
import path from 'path';
import { browser } from '@wdio/globals';

type StepStatus = 'running' | 'passed' | 'failed';

type StepEntry = {
  id: number;
  name: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  status: StepStatus;
  error?: {
    message: string;
    stack?: string;
  };
};

type RunContext = {
  runId: string;
  rootDir: string;
  artifactsDir: string;
  screenshotsDir: string;
  dumpsDir: string;
  logsDir: string;
  stepsPath: string;
  storageDir: string;
  steps: StepEntry[];
  stepCounter: number;
};

let runContext: RunContext | null = null;

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function initRunContext(rootDir: string): RunContext {
  if (runContext) {
    return runContext;
  }

  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const artifactsDir = path.join(rootDir, 'artifacts', 'vscode-ui', runId);
  const screenshotsDir = path.join(artifactsDir, 'screenshots');
  const dumpsDir = path.join(artifactsDir, 'ui-dump');
  const logsDir = path.join(artifactsDir, 'logs');
  const storageDir = path.join(artifactsDir, 'vscode-storage');
  const stepsPath = path.join(artifactsDir, 'steps.json');

  ensureDir(artifactsDir);
  ensureDir(screenshotsDir);
  ensureDir(dumpsDir);
  ensureDir(logsDir);
  ensureDir(storageDir);

  runContext = {
    runId,
    rootDir,
    artifactsDir,
    screenshotsDir,
    dumpsDir,
    logsDir,
    stepsPath,
    storageDir,
    steps: [],
    stepCounter: 0
  };

  fs.writeFileSync(stepsPath, JSON.stringify([], null, 2), 'utf8');

  return runContext;
}

export function getRunContext(): RunContext {
  if (!runContext) {
    throw new Error('Run context not initialized.');
  }
  return runContext;
}

async function writeSteps(): Promise<void> {
  const context = getRunContext();
  fs.writeFileSync(context.stepsPath, JSON.stringify(context.steps, null, 2), 'utf8');
}

async function captureScreenshot(fileName: string): Promise<void> {
  const context = getRunContext();
  const target = path.join(context.screenshotsDir, `${fileName}.png`);
  await browser.saveScreenshot(target);
}

export async function step<T>(name: string, action: () => Promise<T>): Promise<T> {
  const context = getRunContext();
  const id = ++context.stepCounter;
  const entry: StepEntry = {
    id,
    name,
    startTime: nowIso(),
    status: 'running'
  };

  context.steps.push(entry);
  await writeSteps();

  try {
    const result = await action();
    entry.status = 'passed';
    return result;
  } catch (error) {
    entry.status = 'failed';
    entry.error = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    throw error;
  } finally {
    entry.endTime = nowIso();
    if (entry.startTime) {
      const start = Date.parse(entry.startTime);
      const end = Date.parse(entry.endTime);
      entry.durationMs = Number.isFinite(end - start) ? end - start : undefined;
    }
    await captureScreenshot(`step-${id}-${sanitizeFileName(name)}`);
    await writeSteps();
  }
}

export async function captureFailureArtifacts(error?: unknown): Promise<void> {
  const context = getRunContext();
  const workbench = await browser.getWorkbench();

  try {
    const notifications = await workbench.getNotifications();
    const messages = await Promise.all(notifications.map((item) => item.getMessage()));
    fs.writeFileSync(
      path.join(context.dumpsDir, 'notifications.json'),
      JSON.stringify(messages, null, 2),
      'utf8'
    );
  } catch (dumpError) {
    fs.writeFileSync(
      path.join(context.dumpsDir, 'notifications.error.txt'),
      String(dumpError),
      'utf8'
    );
  }

  try {
    const configKeys = [
      'workbench.activityBar.visible',
      'workbench.statusBar.visible',
      'editor.minimap.enabled',
      'breadcrumbs.enabled',
      'workbench.colorCustomizations'
    ];
    const configSnapshot = await browser.executeWorkbench((vscode, keys: string[]) => {
      const config = vscode.workspace.getConfiguration();
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        const value = config.inspect(key)?.globalValue;
        result[key] = value === undefined ? null : value;
      }
      return result;
    }, configKeys);
    fs.writeFileSync(
      path.join(context.dumpsDir, 'config.json'),
      JSON.stringify(configSnapshot, null, 2),
      'utf8'
    );
  } catch (dumpError) {
    fs.writeFileSync(
      path.join(context.dumpsDir, 'config.error.txt'),
      String(dumpError),
      'utf8'
    );
  }

  if (error) {
    fs.writeFileSync(
      path.join(context.dumpsDir, 'error.txt'),
      error instanceof Error ? error.stack ?? error.message : String(error),
      'utf8'
    );
  }

  await captureScreenshot('failure');
}
