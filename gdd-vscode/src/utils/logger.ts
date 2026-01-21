import * as vscode from 'vscode';

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
}
