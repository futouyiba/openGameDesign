import * as vscode from 'vscode';
import OpenAI from 'openai';

export class TranscriptionService {
    constructor(private ai: any) { } // ai param kept for signature compatibility if needed, or remove.

    public async transcribeAudio(audioBuffer: Buffer): Promise<string> {
        const apiKey = vscode.workspace.getConfiguration('gdd').get<string>('openaiApiKey')
            || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error('请在设置中配置 OpenAI API Key (gdd.openaiApiKey) 以使用语音功能');
        }

        const openai = new OpenAI({ apiKey });
        const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'zh'
        });

        return transcription.text;
    }
}
