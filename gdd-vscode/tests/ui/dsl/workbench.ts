import { browser } from '@wdio/globals';
import { step } from '../support/artifacts';

async function readGlobalConfigValues(keys: string[]): Promise<Record<string, unknown>> {
  return browser.executeWorkbench((vscode, configKeys: string[]) => {
    const config = vscode.workspace.getConfiguration();
    const result: Record<string, unknown> = {};
    for (const key of configKeys) {
      const value = config.inspect(key)?.globalValue;
      result[key] = value === undefined ? null : value;
    }
    return result;
  }, keys);
}

export async function listCommandPaletteItems(query: string): Promise<string[]> {
  const label = query.startsWith('>') ? query : `>${query}`;
  return step(`List command palette items: ${label}`, async () => {
    const workbench = await browser.getWorkbench();
    const prompt = await workbench.openCommandPrompt();
    await prompt.setText(label);
    const items = await prompt.getQuickPicks();
    const labels = await Promise.all(items.map((item) => item.getLabel()));
    await browser.keys(['Escape']);
    return labels;
  });
}

export async function runCommand(commandTitle: string): Promise<void> {
  await step(`Run command: ${commandTitle}`, async () => {
    const workbench = await browser.getWorkbench();
    await workbench.executeCommand(commandTitle);
  });
}

export async function runCommandById(commandId: string): Promise<void> {
  await step(`Run command id: ${commandId}`, async () => {
    await browser.executeWorkbench((vscode, id: string) => {
      return vscode.commands.executeCommand(id);
    }, commandId);
  });
}

export async function waitForNotification(
  matcher: RegExp | string,
  timeoutMs = 15000
): Promise<void> {
  const description = typeof matcher === 'string' ? matcher : matcher.toString();
  await step(`Wait for notification: ${description}`, async () => {
    const workbench = await browser.getWorkbench();
    await browser.waitUntil(async () => {
      const notifications = await workbench.getNotifications();
      const messages = await Promise.all(notifications.map((item) => item.getMessage()));
      return messages.some((message) =>
        typeof matcher === 'string' ? message.includes(matcher) : matcher.test(message)
      );
    }, {
      timeout: timeoutMs,
      timeoutMsg: `Notification not found: ${description}`
    });
  });
}

export async function getGlobalConfigValues(
  keys: string[]
): Promise<Record<string, unknown>> {
  return step('Read global configuration values', async () => {
    return readGlobalConfigValues(keys);
  });
}

export async function waitForConfigValue(
  key: string,
  expected: unknown,
  timeoutMs = 15000
): Promise<void> {
  await step(`Wait for config: ${key}`, async () => {
    await browser.waitUntil(async () => {
      const values = await readGlobalConfigValues([key]);
      return values[key] === expected;
    }, {
      timeout: timeoutMs,
      timeoutMsg: `Config did not match ${key}=${String(expected)}`
    });
  });
}

export async function openGddActivityBar(): Promise<void> {
  await step('Open GDD activity bar', async () => {
    const workbench = await browser.getWorkbench();
    const activityBar = workbench.getActivityBar();
    const control = await activityBar.getViewControl('GDD');
    if (!control) {
      throw new Error('GDD view container not found in activity bar.');
    }
    await control.openView();
  });
}
