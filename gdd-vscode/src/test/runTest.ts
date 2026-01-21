import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

function readEnvValue(name: string): string | undefined {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        return undefined;
    }
    return value;
}

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        const version = readEnvValue('VSCODE_TEST_VERSION') ?? '1.80.0';
        const userDataDir = readEnvValue('VSCODE_TEST_USER_DATA_DIR')
            ?? fs.mkdtempSync(path.join(os.tmpdir(), 'gdd-vscode-user-data-'));
        const extensionsDir = readEnvValue('VSCODE_TEST_EXTENSIONS_DIR')
            ?? fs.mkdtempSync(path.join(os.tmpdir(), 'gdd-vscode-extensions-'));

        const launchArgs: string[] = [
            `--user-data-dir=${userDataDir}`,
            `--extensions-dir=${extensionsDir}`
        ];

        const profileName = readEnvValue('VSCODE_TEST_PROFILE');
        if (profileName) {
            launchArgs.push('--profile', profileName);
        }

        process.env.GDD_TEST_USER_DATA_DIR = userDataDir;
        process.env.GDD_TEST_EXTENSIONS_DIR = extensionsDir;
        process.env.GDD_TEST_PROFILE = profileName ?? '__none__';
        process.env.GDD_TEST_VERSION = version;

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            version,
            launchArgs
        });
    } catch (error) {
        console.error('Failed to run tests');
        console.error(error);
        process.exit(1);
    }
}

main();
