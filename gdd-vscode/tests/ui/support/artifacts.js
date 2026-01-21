"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRunContext = initRunContext;
exports.getRunContext = getRunContext;
exports.step = step;
exports.captureFailureArtifacts = captureFailureArtifacts;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const globals_1 = require("@wdio/globals");
let runContext = null;
function ensureDir(dir) {
    fs_1.default.mkdirSync(dir, { recursive: true });
}
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
}
function nowIso() {
    return new Date().toISOString();
}
function initRunContext(rootDir) {
    if (runContext) {
        return runContext;
    }
    const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    const artifactsDir = path_1.default.join(rootDir, 'artifacts', 'vscode-ui', runId);
    const screenshotsDir = path_1.default.join(artifactsDir, 'screenshots');
    const dumpsDir = path_1.default.join(artifactsDir, 'ui-dump');
    const logsDir = path_1.default.join(artifactsDir, 'logs');
    const storageDir = path_1.default.join(artifactsDir, 'vscode-storage');
    const stepsPath = path_1.default.join(artifactsDir, 'steps.json');
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
    fs_1.default.writeFileSync(stepsPath, JSON.stringify([], null, 2), 'utf8');
    return runContext;
}
function getRunContext() {
    if (!runContext) {
        throw new Error('Run context not initialized.');
    }
    return runContext;
}
async function writeSteps() {
    const context = getRunContext();
    fs_1.default.writeFileSync(context.stepsPath, JSON.stringify(context.steps, null, 2), 'utf8');
}
async function captureScreenshot(fileName) {
    const context = getRunContext();
    const target = path_1.default.join(context.screenshotsDir, `${fileName}.png`);
    await globals_1.browser.saveScreenshot(target);
}
async function step(name, action) {
    const context = getRunContext();
    const id = ++context.stepCounter;
    const entry = {
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
    }
    catch (error) {
        entry.status = 'failed';
        entry.error = {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        };
        throw error;
    }
    finally {
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
async function captureFailureArtifacts(error) {
    const context = getRunContext();
    const workbench = await globals_1.browser.getWorkbench();
    try {
        const notifications = await workbench.getNotifications();
        const messages = await Promise.all(notifications.map((item) => item.getMessage()));
        fs_1.default.writeFileSync(path_1.default.join(context.dumpsDir, 'notifications.json'), JSON.stringify(messages, null, 2), 'utf8');
    }
    catch (dumpError) {
        fs_1.default.writeFileSync(path_1.default.join(context.dumpsDir, 'notifications.error.txt'), String(dumpError), 'utf8');
    }
    try {
        const configKeys = [
            'workbench.activityBar.visible',
            'workbench.statusBar.visible',
            'editor.minimap.enabled',
            'breadcrumbs.enabled',
            'workbench.colorCustomizations'
        ];
        const configSnapshot = await globals_1.browser.executeWorkbench((vscode, keys) => {
            const config = vscode.workspace.getConfiguration();
            const result = {};
            for (const key of keys) {
                const value = config.inspect(key)?.globalValue;
                result[key] = value === undefined ? null : value;
            }
            return result;
        }, configKeys);
        fs_1.default.writeFileSync(path_1.default.join(context.dumpsDir, 'config.json'), JSON.stringify(configSnapshot, null, 2), 'utf8');
    }
    catch (dumpError) {
        fs_1.default.writeFileSync(path_1.default.join(context.dumpsDir, 'config.error.txt'), String(dumpError), 'utf8');
    }
    if (error) {
        fs_1.default.writeFileSync(path_1.default.join(context.dumpsDir, 'error.txt'), error instanceof Error ? error.stack ?? error.message : String(error), 'utf8');
    }
    await captureScreenshot('failure');
}
//# sourceMappingURL=artifacts.js.map