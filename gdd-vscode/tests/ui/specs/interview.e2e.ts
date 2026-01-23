import { browser } from '@wdio/globals';

describe('GDD Interview Flow', () => {
    it('should handle start/resume interview and verify webview interaction', async () => {
        const workbench = await browser.getWorkbench();
        console.log('--- TEST START: GDD Interview ---');

        // 1. Run Command
        await workbench.executeCommand('GDD: Start Interview');
        console.log('Command executed');
        await browser.pause(2000);

        // 2. Handle Potential Prompts (Dir, Model, Key)
        // We iterate briefly to handle whatever pops up.
        // Sequence is: Dir -> Model -> API Key.
        // If Resuming: None (or maybe API Key if missing).

        // Check for InputBox (Dir or Key or Model ID)
        try {
            const input = await workbench.getInputBox();
            if (await input.elem.isDisplayed()) {
                const placeholder = await input.getPlaceHolder();
                console.log('Detected InputBox:', placeholder);

                if (placeholder === '请输入模型 ID') {
                    // Specific case
                    await input.confirm();
                } else if (placeholder && placeholder.includes('API Key')) {
                    await input.setText('sk-dummy-test-key');
                    await input.confirm();
                } else {
                    // Assume it's the directory prompt or Model ID default
                    await input.confirm();
                }
                await browser.pause(1000);
            }
        } catch (e) {
            console.log('No InputBox detected immediately');
        }

        // Check for QuickPick (Model Selection)
        try {
            const quickPick = await workbench.getQuickPick();
            if (await quickPick.elem.isDisplayed()) {
                console.log('Detected QuickPick');
                // Select first available (OpenAI default)
                const items = await quickPick.getItems();
                if (items.length > 0) {
                    await items[0].select();
                    console.log('Selected Model');
                }
                await browser.pause(1000);
            }
        } catch (e) {
            console.log('No QuickPick detected');
        }

        // Check for InputBox again (Model ID or API Key after QuickPick)
        try {
            const input = await workbench.getInputBox();
            if (await input.elem.isDisplayed()) {
                const placeholder = await input.getPlaceHolder();
                console.log('Detected InputBox (2):', placeholder);
                if (placeholder && placeholder.includes('API Key')) {
                    await input.setText('sk-dummy-test-key');
                    await input.confirm();
                } else {
                    await input.confirm();
                }
                await browser.pause(1000);
            }
        } catch (e) {
            console.log('No InputBox (2) detected');
        }

        // 3. Wait for Webview
        console.log('Waiting for Webview...');
        const webview = await workbench.getWebviewByTitle('GDD 访谈');
        await webview.open();
        console.log('Webview opened');

        // 4. Verify Content & Interact
        // Switch to webview frame implicitly done by open()? 
        // WDIO service documentation says open() returns handle but doesn't auto-switch context fully 
        // unless we use `browser.switchToFrame`?
        // Actually `webview.open()` puts us in the frame.

        const initialText = await $('body').getText();
        console.log('Webview Body Text:', initialText);
        expect(initialText).toContain('AI');

        // Type Message
        const textarea = await $('textarea#answer');
        await textarea.setValue('Test Message Auto');
        console.log('Typed message');

        // Click Send
        const sendBtn = await $('button#sendButton');
        await sendBtn.click();
        console.log('Clicked Send');

        // Verify Message Appears
        await browser.waitUntil(async () => {
            const text = await $('body').getText();
            return text.includes('Test Message Auto');
        }, { timeout: 10000, interval: 1000, timeoutMsg: 'Message did not appear in chat' });

        console.log('Verified message in chat');
        console.log('--- TEST PASS ---');
    });
});
