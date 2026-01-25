import * as vscode from 'vscode';

const writerModeSnapshotKey = 'gdd.writerMode.snapshot';
const writerModeEnabledKey = 'gdd.writerMode.enabled';

interface WriterModeSnapshot {
    'workbench.activityBar.visible': boolean | null;
    'workbench.statusBar.visible': boolean | null;
    'editor.minimap.enabled': boolean | null;
    'breadcrumbs.enabled': boolean | null;
    'workbench.colorCustomizations': Record<string, string> | null;
}

function readGlobalValue<T>(config: vscode.WorkspaceConfiguration, key: string): T | null {
    const inspected = config.inspect<T>(key);
    if (!inspected || inspected.globalValue === undefined) {
        return null;
    }
    return inspected.globalValue;
}

function isSettingRegistered(config: vscode.WorkspaceConfiguration, key: string): boolean {
    return config.inspect(key) !== undefined;
}

export async function enableWriterModeCommand(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration();
    const isEnabled = context.globalState.get<boolean>(writerModeEnabledKey) === true;
    if (isEnabled) {
        vscode.window.showInformationMessage('Writer Mode is already enabled.');
        return;
    }

    const snapshot: WriterModeSnapshot = {
        'workbench.activityBar.visible': readGlobalValue<boolean>(config, 'workbench.activityBar.visible'),
        'workbench.statusBar.visible': readGlobalValue<boolean>(config, 'workbench.statusBar.visible'),
        'editor.minimap.enabled': readGlobalValue<boolean>(config, 'editor.minimap.enabled'),
        'breadcrumbs.enabled': readGlobalValue<boolean>(config, 'breadcrumbs.enabled'),
        'workbench.colorCustomizations': readGlobalValue<Record<string, string>>(config, 'workbench.colorCustomizations')
    };

    await context.globalState.update(writerModeSnapshotKey, snapshot);
    await context.globalState.update(writerModeEnabledKey, true);

    const luminaTheme: Record<string, string> = {
        "sideBar.background": "#18181B",
        "editor.background": "#18181B",
        "activityBar.background": "#18181B",
        "tab.activeBackground": "#18181B",
        "tab.border": "transparent",
        "editorGroupHeader.tabsBackground": "#18181B",
        "statusBar.background": "#18181B",
        "titleBar.activeBackground": "#18181B",
        "sideBar.border": "#27272A",
        "sideBarSectionHeader.background": "#18181B"
    };

    const updates: Thenable<void>[] = [];
    const queueUpdate = (key: string, value: unknown) => {
        if (isSettingRegistered(config, key)) {
            updates.push(
                config.update(key, value, vscode.ConfigurationTarget.Global).then(undefined, (error) => {
                    console.warn(`Writer Mode setting update failed for ${key}:`, error);
                })
            );
        }
    };

    queueUpdate('workbench.activityBar.visible', false);
    queueUpdate('workbench.statusBar.visible', false);
    queueUpdate('editor.minimap.enabled', false);
    queueUpdate('breadcrumbs.enabled', false);
    queueUpdate('workbench.colorCustomizations', luminaTheme);

    await Promise.all(updates);
    vscode.window.showInformationMessage('Writer Mode Enabled: Focused environment active.');
}

export async function disableWriterModeCommand(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration();
    const snapshot = context.globalState.get<WriterModeSnapshot>(writerModeSnapshotKey);
    if (!snapshot) {
        vscode.window.showInformationMessage('Writer Mode is not enabled.');
        return;
    }

    const restoredColorCustomizations = snapshot['workbench.colorCustomizations'] === null
        ? undefined
        : snapshot['workbench.colorCustomizations'];

    const updates: Thenable<void>[] = [];
    const queueUpdate = (key: string, value: unknown) => {
        if (isSettingRegistered(config, key)) {
            updates.push(
                config.update(key, value, vscode.ConfigurationTarget.Global).then(undefined, (error) => {
                    console.warn(`Writer Mode setting restore failed for ${key}:`, error);
                })
            );
        }
    };

    queueUpdate('workbench.activityBar.visible', snapshot['workbench.activityBar.visible'] ?? undefined);
    queueUpdate('workbench.statusBar.visible', snapshot['workbench.statusBar.visible'] ?? undefined);
    queueUpdate('editor.minimap.enabled', snapshot['editor.minimap.enabled'] ?? undefined);
    queueUpdate('breadcrumbs.enabled', snapshot['breadcrumbs.enabled'] ?? undefined);
    queueUpdate('workbench.colorCustomizations', restoredColorCustomizations);

    await Promise.all(updates);

    await context.globalState.update(writerModeSnapshotKey, undefined);
    await context.globalState.update(writerModeEnabledKey, false);

    vscode.window.showInformationMessage('Writer Mode Disabled: Standard VS Code environment restored.');
}
