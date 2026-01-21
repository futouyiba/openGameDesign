import * as fs from 'fs';
import * as path from 'path';
import Mocha from 'mocha';

function collectTestFiles(dir: string, files: string[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectTestFiles(entryPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
            files.push(entryPath);
        }
    }
}

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '..');
    const testFiles: string[] = [];
    collectTestFiles(testsRoot, testFiles);

    for (const file of testFiles) {
        mocha.addFile(file);
    }

    return new Promise((resolve, reject) => {
        mocha.run((failures: number) => {
            if (failures > 0) {
                reject(new Error(`${failures} tests failed.`));
            } else {
                resolve();
            }
        });
    });
}
