import { Mail } from './types.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export class MailSystem {
  private mailDir: string;
  private mails: Mail[] = [];

  constructor(projectRoot: string) {
    this.mailDir = join(projectRoot, '.gdd', 'mails');
  }

  async init() {
    if (!existsSync(this.mailDir)) {
      await mkdir(this.mailDir, { recursive: true });
    }
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
    const mailFile = join(this.mailDir, 'mails.json');
    if (existsSync(mailFile)) {
      const data = await readFile(mailFile, 'utf-8');
      this.mails = JSON.parse(data);
    }
  }

  private async saveMails() {
    const mailFile = join(this.mailDir, 'mails.json');
    await writeFile(mailFile, JSON.stringify(this.mails, null, 2));
  }
}
