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

  async sendMail(mail: Omit<Mail, 'id' | 'timestamp' | 'status'>) {
    const newMail: Mail = {
      ...mail,
      id: Date.now().toString(),
      timestamp: new Date(),
      status: 'sent'
    };
    this.mails.push(newMail);
    await this.saveMails();
    return newMail;
  }

  async createDraft(mail: Omit<Mail, 'id' | 'timestamp' | 'status'>) {
    const draft: Mail = {
      ...mail,
      id: Date.now().toString(),
      timestamp: new Date(),
      status: 'draft'
    };
    this.mails.push(draft);
    await this.saveMails();
    return draft;
  }

  async sendDraft(mailId: string) {
    const mail = this.mails.find(m => m.id === mailId);
    if (mail && mail.status === 'draft') {
      mail.status = 'sent';
      await this.saveMails();
    }
  }

  getUnprocessedMails(priorityFilter?: Mail['priority'][]): Mail[] {
    return this.mails.filter(m =>
      m.status !== 'processed' && (!priorityFilter || priorityFilter.includes(m.priority))
    );
  }

  getMailsByStatus(status: Mail['status']): Mail[] {
    return this.mails.filter(m => m.status === status);
  }

  getMailsByFrom(from: Mail['from']): Mail[] {
    return this.mails.filter(m => m.from === from);
  }

  async updateMailStatus(mailId: string, status: Mail['status']) {
    const mail = this.mails.find(m => m.id === mailId);
    if (mail) {
      mail.status = status;
      await this.saveMails();
    }
  }

  async markProcessed(mailId: string) {
    await this.updateMailStatus(mailId, 'processed');
  }

  async markRead(mailId: string) {
    await this.updateMailStatus(mailId, 'read');
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
