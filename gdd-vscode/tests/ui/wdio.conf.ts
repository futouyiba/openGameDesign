import path from 'path';
import type { Options } from '@wdio/types';
import { initRunContext, captureFailureArtifacts, copyExtensionHostLogs } from './support/artifacts';

const rootDir = path.resolve(__dirname, '..', '..');
const runContext = initRunContext(rootDir);

const vscodeVersion = process.env.VSCODE_UI_VERSION ?? 'stable';
const logLevel = (process.env.WDIO_LOG_LEVEL ?? 'info') as Options.Testrunner['logLevel'];

export const config: Options.Testrunner = {
  runner: 'local',
  specs: [
    path.join(__dirname, 'specs', 'ui.e2e.ts')
  ],

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
      project: path.join(__dirname, 'tsconfig.json'),
      transpileOnly: true
    }
  },
  services: [
    ['vscode', { cachePath: path.join(rootDir, '.vscode-test') }]
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
    const rawCapabilities = capabilities as Record<string, unknown>;
    const options = rawCapabilities['wdio:vscodeOptions'];
    if (options && typeof options === 'object') {
      (options as Record<string, unknown>).storagePath = path.join(
        runContext.storageDir,
        cid.replace(/[^a-zA-Z0-9_-]/g, '_')
      );
    }
  },
  before: async () => {
    process.env.GDD_UI_RUN_ID = runContext.runId;
  },
  afterTest: async (_test, _context, result) => {
    if (!result.passed) {
      await captureFailureArtifacts(result.error);
    }
  },
  after: async () => {
    copyExtensionHostLogs();
  }
};
