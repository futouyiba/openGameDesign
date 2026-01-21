"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCommandPaletteItems = listCommandPaletteItems;
exports.runCommand = runCommand;
exports.runCommandById = runCommandById;
exports.waitForNotification = waitForNotification;
exports.getGlobalConfigValues = getGlobalConfigValues;
exports.waitForConfigValue = waitForConfigValue;
exports.openGddActivityBar = openGddActivityBar;
const globals_1 = require("@wdio/globals");
const artifacts_1 = require("../support/artifacts");
async function readGlobalConfigValues(keys) {
    return globals_1.browser.executeWorkbench((vscode, configKeys) => {
        const config = vscode.workspace.getConfiguration();
        const result = {};
        for (const key of configKeys) {
            const value = config.inspect(key)?.globalValue;
            result[key] = value === undefined ? null : value;
        }
        return result;
    }, keys);
}
async function listCommandPaletteItems(query) {
    const label = query.startsWith('>') ? query : `>${query}`;
    return (0, artifacts_1.step)(`List command palette items: ${label}`, async () => {
        const workbench = await globals_1.browser.getWorkbench();
        const prompt = await workbench.openCommandPrompt();
        await prompt.setText(label);
        const items = await prompt.getQuickPicks();
        const labels = await Promise.all(items.map((item) => item.getLabel()));
        await globals_1.browser.keys(['Escape']);
        return labels;
    });
}
async function runCommand(commandTitle) {
    await (0, artifacts_1.step)(`Run command: ${commandTitle}`, async () => {
        const workbench = await globals_1.browser.getWorkbench();
        await workbench.executeCommand(commandTitle);
    });
}
async function runCommandById(commandId) {
    await (0, artifacts_1.step)(`Run command id: ${commandId}`, async () => {
        await globals_1.browser.executeWorkbench((vscode, id) => {
            return vscode.commands.executeCommand(id);
        }, commandId);
    });
}
async function waitForNotification(matcher, timeoutMs = 15000) {
    const description = typeof matcher === 'string' ? matcher : matcher.toString();
    await (0, artifacts_1.step)(`Wait for notification: ${description}`, async () => {
        const workbench = await globals_1.browser.getWorkbench();
        await globals_1.browser.waitUntil(async () => {
            const notifications = await workbench.getNotifications();
            const messages = await Promise.all(notifications.map((item) => item.getMessage()));
            return messages.some((message) => typeof matcher === 'string' ? message.includes(matcher) : matcher.test(message));
        }, {
            timeout: timeoutMs,
            timeoutMsg: `Notification not found: ${description}`
        });
    });
}
async function getGlobalConfigValues(keys) {
    return (0, artifacts_1.step)('Read global configuration values', async () => {
        return readGlobalConfigValues(keys);
    });
}
async function waitForConfigValue(key, expected, timeoutMs = 15000) {
    await (0, artifacts_1.step)(`Wait for config: ${key}`, async () => {
        await globals_1.browser.waitUntil(async () => {
            const values = await readGlobalConfigValues([key]);
            return values[key] === expected;
        }, {
            timeout: timeoutMs,
            timeoutMsg: `Config did not match ${key}=${String(expected)}`
        });
    });
}
async function openGddActivityBar() {
    await (0, artifacts_1.step)('Open GDD activity bar', async () => {
        const workbench = await globals_1.browser.getWorkbench();
        const activityBar = workbench.getActivityBar();
        const control = await activityBar.getViewControl('GDD');
        if (!control) {
            throw new Error('GDD view container not found in activity bar.');
        }
        await control.openView();
    });
}
//# sourceMappingURL=workbench.js.map