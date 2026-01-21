import { expect, browser } from '@wdio/globals';
import {
  getGlobalConfigValues,
  runCommandById,
  waitForConfigValue
} from '../dsl/workbench';

const configKeys = [
  'workbench.activityBar.visible',
  'workbench.statusBar.visible',
  'editor.minimap.enabled',
  'breadcrumbs.enabled',
  'workbench.colorCustomizations'
];

describe('Writer Mode', () => {
  it('toggles VS Code UI settings via command palette', async () => {
    const initial = await getGlobalConfigValues(configKeys);

    await runCommandById('gdd.enableWriterMode');

    if (initial['workbench.activityBar.visible'] !== null) {
      await waitForConfigValue('workbench.activityBar.visible', false);
    }
    if (initial['workbench.statusBar.visible'] !== null) {
      await waitForConfigValue('workbench.statusBar.visible', false);
    }
    if (initial['editor.minimap.enabled'] !== null) {
      await waitForConfigValue('editor.minimap.enabled', false);
    }
    if (initial['breadcrumbs.enabled'] !== null) {
      await waitForConfigValue('breadcrumbs.enabled', false);
    }

    const enabled = await getGlobalConfigValues(configKeys);

    if (initial['workbench.colorCustomizations'] !== null) {
      const colors = enabled['workbench.colorCustomizations'] as Record<string, string> | null;
      expect(colors?.['sideBar.background']).toBe('#18181B');
    }

    await runCommandById('gdd.disableWriterMode');
    if (initial['workbench.statusBar.visible'] !== null) {
      await waitForConfigValue('workbench.statusBar.visible', initial['workbench.statusBar.visible']);
    }

    const restored = await getGlobalConfigValues(configKeys);
    expect(restored).toEqual(initial);
  });
});
