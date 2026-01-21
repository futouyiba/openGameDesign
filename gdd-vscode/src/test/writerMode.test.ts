import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Writer Mode Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Writer Mode Toggles Settings', async () => {
		const config = vscode.workspace.getConfiguration();
		const initialSnapshot = {
			activityBarVisible: config.inspect<boolean>('workbench.activityBar.visible')?.globalValue,
			statusBarVisible: config.inspect<boolean>('workbench.statusBar.visible')?.globalValue,
			minimapEnabled: config.inspect<boolean>('editor.minimap.enabled')?.globalValue,
			breadcrumbsEnabled: config.inspect<boolean>('breadcrumbs.enabled')?.globalValue,
			colorCustomizations: config.inspect<Record<string, string>>('workbench.colorCustomizations')?.globalValue
		};

		const seededColors: Record<string, string> = { 'sideBar.background': '#123456' };
		await Promise.all([
			config.update('workbench.activityBar.visible', true, vscode.ConfigurationTarget.Global),
			config.update('workbench.statusBar.visible', true, vscode.ConfigurationTarget.Global),
			config.update('editor.minimap.enabled', true, vscode.ConfigurationTarget.Global),
			config.update('breadcrumbs.enabled', true, vscode.ConfigurationTarget.Global),
			config.update('workbench.colorCustomizations', seededColors, vscode.ConfigurationTarget.Global)
		]);

		try {
			// Enable Writer Mode
			await vscode.commands.executeCommand('gdd.enableWriterMode');
		
			// Check Configuration
			const activityBarEnabled = config.inspect<boolean>('workbench.activityBar.visible');
			assert.strictEqual(activityBarEnabled?.globalValue, false, 'Activity Bar should be hidden');
			const statusBarEnabled = config.inspect<boolean>('workbench.statusBar.visible');
			assert.strictEqual(statusBarEnabled?.globalValue, false, 'Status Bar should be hidden');
			const minimapEnabled = config.inspect<boolean>('editor.minimap.enabled');
			assert.strictEqual(minimapEnabled?.globalValue, false, 'Minimap should be hidden');
			const breadcrumbsEnabled = config.inspect<boolean>('breadcrumbs.enabled');
			assert.strictEqual(breadcrumbsEnabled?.globalValue, false, 'Breadcrumbs should be hidden');
		
			// Check Theme Customization
			const colorCustomizations = config.inspect<Record<string, string>>('workbench.colorCustomizations');
			assert.strictEqual(colorCustomizations?.globalValue?.['sideBar.background'], '#18181B', 'Sidebar background should be set');
		
			// Disable Writer Mode
			await vscode.commands.executeCommand('gdd.disableWriterMode');
			
			// Check Configuration Restored
			const activityBarInspect = config.inspect<boolean>('workbench.activityBar.visible');
			assert.strictEqual(activityBarInspect?.globalValue, true, 'Activity Bar setting should be restored');
			const statusBarInspect = config.inspect<boolean>('workbench.statusBar.visible');
			assert.strictEqual(statusBarInspect?.globalValue, true, 'Status Bar setting should be restored');
			const minimapInspect = config.inspect<boolean>('editor.minimap.enabled');
			assert.strictEqual(minimapInspect?.globalValue, true, 'Minimap setting should be restored');
			const breadcrumbsInspect = config.inspect<boolean>('breadcrumbs.enabled');
			assert.strictEqual(breadcrumbsInspect?.globalValue, true, 'Breadcrumbs setting should be restored');
	
			const colorInspect = config.inspect<Record<string, string>>('workbench.colorCustomizations');
			assert.deepStrictEqual(colorInspect?.globalValue, seededColors, 'Color customizations should be restored');
		} finally {
			await vscode.commands.executeCommand('gdd.disableWriterMode');
			await Promise.all([
				config.update('workbench.activityBar.visible', initialSnapshot.activityBarVisible, vscode.ConfigurationTarget.Global),
				config.update('workbench.statusBar.visible', initialSnapshot.statusBarVisible, vscode.ConfigurationTarget.Global),
				config.update('editor.minimap.enabled', initialSnapshot.minimapEnabled, vscode.ConfigurationTarget.Global),
				config.update('breadcrumbs.enabled', initialSnapshot.breadcrumbsEnabled, vscode.ConfigurationTarget.Global),
				config.update('workbench.colorCustomizations', initialSnapshot.colorCustomizations, vscode.ConfigurationTarget.Global)
			]);
		}
	});

	test('Test Host Uses Isolation Config', () => {
		const userDataDir = process.env.GDD_TEST_USER_DATA_DIR;
		const extensionsDir = process.env.GDD_TEST_EXTENSIONS_DIR;
		const profileName = process.env.VSCODE_TEST_PROFILE;
		const recordedProfile = process.env.GDD_TEST_PROFILE;
		const version = process.env.GDD_TEST_VERSION;

		assert.ok(userDataDir, 'Expected GDD_TEST_USER_DATA_DIR to be set');
		assert.ok(extensionsDir, 'Expected GDD_TEST_EXTENSIONS_DIR to be set');
		assert.ok(version, 'Expected GDD_TEST_VERSION to be set');

		if (profileName) {
			assert.strictEqual(recordedProfile, profileName, 'Expected profile name to match');
		} else {
			assert.strictEqual(recordedProfile, '', 'Expected profile name to be empty');
		}
	});
});
