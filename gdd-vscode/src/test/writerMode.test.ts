import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Writer Mode Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Writer Mode Toggles Settings', async () => {
		// Enable Writer Mode
		await vscode.commands.executeCommand('gdd.enableWriterMode');

        // Check Configuration
        const config = vscode.workspace.getConfiguration();
        assert.strictEqual(config.get('workbench.activityBar.visible'), false, 'Activity Bar should be hidden');
        assert.strictEqual(config.get('workbench.statusBar.visible'), false, 'Status Bar should be hidden');
        assert.strictEqual(config.get('editor.minimap.enabled'), false, 'Minimap should be hidden');

        // Check Theme Customization
        const colorCustomizations = config.get('workbench.colorCustomizations') as any;
        assert.strictEqual(colorCustomizations['sideBar.background'], '#18181B', 'Sidebar background should be set');

		// Disable Writer Mode
		await vscode.commands.executeCommand('gdd.disableWriterMode');
        
        // Check Configuration Reset (should be undefined/default)
        // Note: VS Code API returns the default value if the setting is unset, so we check if it matches the default logic or just isn't explicitly false if default is true. 
        // Better: Check inspect().globalValue or workspaceValue
        const activityBarInspect = config.inspect('workbench.activityBar.visible');
        assert.strictEqual(activityBarInspect?.globalValue, undefined, 'Activity Bar setting should be cleared from global');

        const colorInspect = config.inspect('workbench.colorCustomizations');
        assert.strictEqual(colorInspect?.globalValue, undefined, 'Color customizations should be cleared from global');
	});
});
