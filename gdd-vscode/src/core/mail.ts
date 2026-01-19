import { Mail } from './types';
import * as vscode from 'vscode';
import * as path from 'path';

export class MailSystem {
  private mailDir: string;
  private mails: Mail[] = [];

  constructor(projectRoot: string) {
    this.mailDir = path.join(projectRoot, '.gdd', 'mails');
  }

  async init() {
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(this.mailDir));
    await this.loadMails();
  }

  async sendMail(mail: Omit<Mail, 'id' | 'timestamp' | 'processed'>) {
    const newMail: Mail = {
      ...mail,
      id: Date.now().toString(),
      timestamp: new Date(),
      processed: false
    };
    this.mails.push(newMail);
    await this.saveMails();
    return newMail;
  }

  getUnprocessedMails(priorityFilter?: Mail['priority'][]): Mail[] {
    return this.mails.filter(m =>
      !m.processed && (!priorityFilter || priorityFilter.includes(m.priority))
    );
  }

  async markProcessed(mailId: string) {
    const mail = this.mails.find(m => m.id === mailId);
    if (mail) {
      mail.processed = true;
      await this.saveMails();
    }
  }

  private async loadMails() {
    const mailFile = path.join(this.mailDir, 'mails.json');
    try {
      const data = await vscode.workspace.fs.readFile(vscode.Uri.file(mailFile));
      this.mails = JSON.parse(data.toString());
    } catch {
      // 文件不存在
    }
  }

  private async saveMails() {
    const mailFile = path.join(this.mailDir, 'mails.json');
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(mailFile),
      Buffer.from(JSON.stringify(this.mails, null, 2))
    );
  }
}
