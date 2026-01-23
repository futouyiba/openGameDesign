import { browser } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

// Manual logging helper
const logPath = 'C:\\Users\\futou\\gdd_test_trace.log';
function log(msg: string) {
    try {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {
        // ignore
    }
}

describe('Interview Panel Debug', () => {
    it('should load the interview panel and execute webview script', async () => {
        // Reset log
        try { fs.writeFileSync(logPath, '--- TEST STARTED ---\n'); } catch (e) { }

        log('Getting workbench...');
        const workbench = await browser.getWorkbench();

        log('Executing GDD: Start Interview...');
        await workbench.executeCommand('GDD: Start Interview');
        await browser.pause(2000);

        // Helper to handle input box
        const handleInput = async (expectedPartial: string, inputText?: string) => {
            log(`Checking input for: ${expectedPartial}`);
            try {
                const input = await workbench.getInputBox();
                if (await input.isDisplayed()) {
                    const placeholder = await input.getPlaceHolder() || '';
                    const message = await input.getMessage() || '';
                    log(`InputBox found: Placeholder="${placeholder}", Message="${message}"`);

                    if (placeholder.includes(expectedPartial) || message.includes(expectedPartial)) {
                        if (inputText) {
                            log(`Setting text: ${inputText}`);
                            await input.setText(inputText);
                        }
                        log('Confirming input');
                        await input.confirm();
                        await browser.pause(1000);
                        return true;
                    } else {
                        log(`Input does not match expected "${expectedPartial}"`);
                    }
                } else {
                    log('Input box not displayed');
                }
            } catch (e: any) {
                log(`Error checking input: ${e.message}`);
            }
            return false;
        };

        // 1. Output Directory
        await handleInput('输出目录', undefined);

        // 2. Model Selection (QuickPick)
        log('Checking Model Selection QuickPick...');
        try {
            const input = await workbench.getInputBox();
            const placeholder = await input.getPlaceHolder() || '';
            log(`Current Input: ${placeholder}`);
            if (placeholder.includes('选择访谈使用的 LLM')) {
                log('Selecting first model...');
                await input.selectQuickPick(0);
                await browser.pause(1000);
            }
        } catch (e: any) {
            log(`Model Selection Error: ${e.message}`);
        }

        // 3. API Key
        await handleInput('API Key', 'sk-dummy-test-key');

        // 4. Wait for Webview
        log('Waiting for Webview "GDD 访谈"...');
        await browser.pause(5000);

        try {
            log('Looking for Webview by title...');
            const webview = await workbench.getWebviewByTitle('GDD 访谈');
            log('Opening Webview...');
            await webview.open();

            await browser.pause(2000);

            log('Connecting to Webview context...');
            const bodyColor = await browser.execute(() => document.body.style.backgroundColor);
            log(`Webview Body Color: ${bodyColor}`);

            const bodyText = await browser.execute(() => document.body.innerText);
            log(`Webview Body Content: ${bodyText.substring(0, 100).replace(/\n/g, ' ')}`);

            if (bodyColor !== 'darkgreen') {
                const errorDiv = await browser.execute(() => document.querySelector('div[style*="darkred"]')?.textContent);
                if (errorDiv) {
                    log(`FATAL WEBVIEW ERROR FOUND: ${errorDiv}`);
                    throw new Error(`Webview script FATAL ERROR: ${errorDiv}`);
                }
                throw new Error(`Webview script failed! Color: ${bodyColor}`);
            }
            log('TEST PASSED: Green color detected');
        } catch (e: any) {
            log(`Webview Interaction Error: ${e.message}`);
            throw e;
        }
    });
});
