"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@wdio/globals");
const workbench_1 = require("../dsl/workbench");
const configKeys = [
    'workbench.activityBar.visible',
    'workbench.statusBar.visible',
    'editor.minimap.enabled',
    'breadcrumbs.enabled',
    'workbench.colorCustomizations'
];
describe('Writer Mode', () => {
    it('toggles VS Code UI settings via command palette', async () => {
        const initial = await (0, workbench_1.getGlobalConfigValues)(configKeys);
        await (0, workbench_1.runCommandById)('gdd.enableWriterMode');
        if (initial['workbench.activityBar.visible'] !== null) {
            await (0, workbench_1.waitForConfigValue)('workbench.activityBar.visible', false);
        }
        if (initial['workbench.statusBar.visible'] !== null) {
            await (0, workbench_1.waitForConfigValue)('workbench.statusBar.visible', false);
        }
        if (initial['editor.minimap.enabled'] !== null) {
            await (0, workbench_1.waitForConfigValue)('editor.minimap.enabled', false);
        }
        if (initial['breadcrumbs.enabled'] !== null) {
            await (0, workbench_1.waitForConfigValue)('breadcrumbs.enabled', false);
        }
        const enabled = await (0, workbench_1.getGlobalConfigValues)(configKeys);
        if (initial['workbench.colorCustomizations'] !== null) {
            const colors = enabled['workbench.colorCustomizations'];
            (0, globals_1.expect)(colors?.['sideBar.background']).toBe('#18181B');
        }
        await (0, workbench_1.runCommandById)('gdd.disableWriterMode');
        if (initial['workbench.statusBar.visible'] !== null) {
            await (0, workbench_1.waitForConfigValue)('workbench.statusBar.visible', initial['workbench.statusBar.visible']);
        }
        const restored = await (0, workbench_1.getGlobalConfigValues)(configKeys);
        (0, globals_1.expect)(restored).toEqual(initial);
    });
});
//# sourceMappingURL=writer-mode.e2e.js.map