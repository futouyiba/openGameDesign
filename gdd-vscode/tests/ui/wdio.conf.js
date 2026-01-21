"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
const artifacts_1 = require("./support/artifacts");
const rootDir = path_1.default.resolve(__dirname, '..', '..');
const runContext = (0, artifacts_1.initRunContext)(rootDir);
const vscodeVersion = process.env.VSCODE_UI_VERSION ?? 'stable';
const logLevel = (process.env.WDIO_LOG_LEVEL ?? 'info');
exports.config = {
    runner: 'local',
    specs: [path_1.default.join(__dirname, 'specs', '**/*.e2e.ts')],
    maxInstances: 1,
    maxInstancesPerCapability: 1,
    logLevel,
    outputDir: runContext.logsDir,
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        timeout: 120000
    },
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            project: path_1.default.join(__dirname, 'tsconfig.json'),
            transpileOnly: true
        }
    },
    services: [
        ['vscode', { cachePath: path_1.default.join(rootDir, '.vscode-test') }]
    ],
    capabilities: [
        {
            maxInstances: 1,
            browserName: 'vscode',
            browserVersion: vscodeVersion,
            'wdio:vscodeOptions': {
                extensionPath: rootDir,
                workspacePath: rootDir,
                storagePath: runContext.storageDir,
                verboseLogging: true,
                userSettings: {
                    'extensions.autoUpdate': false,
                    'extensions.ignoreRecommendations': true,
                    'security.workspace.trust.enabled': false,
                    'security.workspace.trust.startupPrompt': 'never',
                    'telemetry.telemetryLevel': 'off',
                    'update.mode': 'none',
                    'workbench.enableExperiments': false,
                    'workbench.startupEditor': 'none',
                    'workbench.tips.enabled': false,
                    'workbench.welcomePage.walkthroughs.openOnInstall': false
                }
            }
        }
    ],
    beforeSession: (_config, capabilities, _specs, cid) => {
        const options = capabilities['wdio:vscodeOptions'];
        if (options) {
            options.storagePath = path_1.default.join(runContext.storageDir, cid.replace(/[^a-zA-Z0-9_-]/g, '_'));
        }
    },
    before: async () => {
        process.env.GDD_UI_RUN_ID = runContext.runId;
    },
    afterTest: async (_test, _context, result) => {
        if (!result.passed) {
            await (0, artifacts_1.captureFailureArtifacts)(result.error);
        }
    }
};
//# sourceMappingURL=wdio.conf.js.map