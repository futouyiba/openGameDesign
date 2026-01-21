const fs = require('fs');
const path = require('path');

const ARTIFACTS_ROOT = path.join(__dirname, '../gdd-vscode/artifacts/vscode-ui');

function getLatestRun() {
  if (!fs.existsSync(ARTIFACTS_ROOT)) return null;
  const runs = fs.readdirSync(ARTIFACTS_ROOT)
    .filter(f => fs.statSync(path.join(ARTIFACTS_ROOT, f)).isDirectory())
    .sort()
    .reverse();
  return runs.length > 0 ? path.join(ARTIFACTS_ROOT, runs[0]) : null;
}

function main() {
  const runDir = getLatestRun();
  if (!runDir) {
    console.log('No artifacts found.');
    return;
  }

  const runId = path.basename(runDir);
  console.log(`# Diagnostic Report for Run: ${runId}\n`);

  // 1. Steps
  const stepsPath = path.join(runDir, 'steps.json');
  if (fs.existsSync(stepsPath)) {
    const steps = JSON.parse(fs.readFileSync(stepsPath, 'utf8'));
    console.log('## Steps');
    steps.forEach(s => {
      const icon = s.status === 'passed' ? '✅' : s.status === 'failed' ? '❌' : '⏳';
      console.log(`- ${icon} [${s.id}] ${s.name} (${s.durationMs || '?'}ms)`);
      if (s.error) {
        console.log(`  Error: ${s.error.message}`);
      }
    });
    console.log('');
  }

  // 2. UI Error
  const errorPath = path.join(runDir, 'ui-dump/error.txt');
  if (fs.existsSync(errorPath)) {
    console.log('## UI Test Error');
    console.log('```');
    console.log(fs.readFileSync(errorPath, 'utf8').trim());
    console.log('```\n');
  }

  // 3. Extension Logs
  const extLogPath = path.join(runDir, 'logs/extension-host.log');
  if (fs.existsSync(extLogPath)) {
    console.log('## Extension Host Log (Last 50 lines)');
    const content = fs.readFileSync(extLogPath, 'utf8');
    const lines = content.split('\n');
    const last50 = lines.slice(-50).join('\n');
    console.log('```');
    console.log(last50);
    console.log('```\n');
  } else {
    console.log('## Extension Host Log');
    console.log('(No log file found. Check if copyExtensionHostLogs ran successfully.)\n');
  }

  // 4. Artifacts Location
  console.log('## Evidence');
  console.log(`Path: ${runDir}`);
}

main();
