const { browser } = require('@wdio/globals');
const fs = require('fs');

const logPath = 'C:\\Users\\futou\\gdd_test_trace.log';
function log(msg) {
    try {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

describe('Interview Panel Debug', () => {
    it('should load the interview panel and execute webview script', async () => {
        try { fs.writeFileSync(logPath, '--- TEST STARTED BYPASS MODE ---\n'); } catch (e) { }

        log('Getting workbench...');
        const workbench = await browser.getWorkbench();

        log('Executing GDD: Start Interview...');
        await workbench.executeCommand('GDD: Start Interview');

        // 1. Output Directory: "输入文档输出目录..." -> Default is fine -> Enter
        log('Step 1: Output Config - Waiting 2s...');
        await browser.pause(2000);
        log('Step 1: Pressing Enter...');
        await browser.keys(['Enter']);

        // 2. Wait for Webview creation (LLM selection is bypassed)
        log('Step 2: Waiting 5s for Webview...');
        await browser.pause(5000);

        try {
            log('Looking for Webview by title...');
            const webview = await workbench.getWebviewByTitle('GDD 访谈');
            log('Opening Webview...');
            await webview.open();

            await browser.pause(2000);

            log('Checking Webview content...');
            const bodyColor = await browser.execute(() => document.body.style.backgroundColor);
            log(`Webview Body Color: ${bodyColor}`);

            const text = await browser.execute(() => document.body.innerText);
            log(`Webview Content: ${text.substring(0, 100).replace(/\n/g, ' ')}`);

            if (bodyColor === 'darkgreen') {
                log('SUCCESS: Green background detected!');
            } else if (bodyColor === 'darkred' || bodyColor === 'red') {
                const err = await browser.execute(() => document.body.innerText);
                log(`FAILURE: Script passed but reported error: ${err}`);
                throw new Error(`Webview script reported error: ${err}`);
            } else {
                log(`FAILURE: Background is ${bodyColor}. Script likely didn't run.`);
                throw new Error(`Webview script did not run (Color: ${bodyColor})`);
            }

        } catch (e) {
            log(`Webview Phase Error: ${e.message}`);
            // Check notifications if webview not found
            const notifs = await workbench.getNotifications();
            for (const n of notifs) {
                const msg = await n.getMessage();
                log(`Notification: ${msg}`);
            }
            throw e;
        }

    });
});
