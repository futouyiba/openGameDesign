"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@wdio/globals");
const workbench_1 = require("../dsl/workbench");
describe('GDD command palette', () => {
    it('lists core GDD commands', async () => {
        const commands = await (0, workbench_1.listCommandPaletteItems)('GDD:');
        (0, globals_1.expect)(commands.some((command) => command.endsWith('Enable Writer Mode'))).toBe(true);
        (0, globals_1.expect)(commands.some((command) => command.endsWith('Disable Writer Mode'))).toBe(true);
        (0, globals_1.expect)(commands.some((command) => command.endsWith('Start New Document'))).toBe(true);
    });
});
//# sourceMappingURL=command-palette.e2e.js.map