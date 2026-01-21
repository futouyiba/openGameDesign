import { expect } from '@wdio/globals';
import { listCommandPaletteItems } from '../dsl/workbench';

describe('GDD command palette', () => {
  it('lists core GDD commands', async () => {
    const commands = await listCommandPaletteItems('GDD:');
    expect(commands.some((command) => command.endsWith('Enable Writer Mode'))).toBe(true);
    expect(commands.some((command) => command.endsWith('Disable Writer Mode'))).toBe(true);
    expect(commands.some((command) => command.endsWith('Start New Document'))).toBe(true);
  });
});
