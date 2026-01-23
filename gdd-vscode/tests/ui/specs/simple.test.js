const fs = require('fs');
const { browser } = require('@wdio/globals');

describe('Simple Test', () => {
    it('should write a file', async () => {
        try {
            fs.writeFileSync('C:\\Users\\futou\\simple_test.log', 'Hello from JS test\n');
            await browser.pause(1000);

            const workbench = await browser.getWorkbench();
            const title = await workbench.getTitleBar().getTitle();

            fs.appendFileSync('C:\\Users\\futou\\simple_test.log', `Title: ${title}\n`);
            console.log('Test finished successfully');
        } catch (e) {
            try {
                fs.appendFileSync('C:\\Users\\futou\\simple_test.log', `Error: ${e.message}\n`);
            } catch (err) {
                console.error(err);
            }
            throw e;
        }
    });
});
