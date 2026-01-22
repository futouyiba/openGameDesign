import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('GDD Assistant');
  }
  return outputChannel;
}

export function log(message: string, data?: any): void {
  const channel = getOutputChannel();
  const timestamp = new Date().toISOString();
  let text = `[${timestamp}] ${message}`;

  if (data) {
    try {
      text += `\n${JSON.stringify(data, null, 2)}`;
    } catch {
      text += `\n[Circular or invalid data]`;
    }
  }

  channel.appendLine(text);
  console.log(text); // Also log to debug console

  // 写入物理文件以便追踪
  try {
    const logFile = path.join(os.homedir(), 'gdd_debug.log');
    fs.appendFileSync(logFile, text + '\n---\n');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}
