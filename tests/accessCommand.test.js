import { describe, expect, it } from 'vitest';
import { matchesAccessCommandName } from '../static/js/commands/access.js';

describe('matchesAccessCommandName', () => {
  it('accepts valid variations', () => {
    expect(matchesAccessCommandName('access')).toBe(true);
    expect(matchesAccessCommandName('Access')).toBe(true);
    expect(matchesAccessCommandName('ACCESS')).toBe(true);
    expect(matchesAccessCommandName('aAccess')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(matchesAccessCommandName('acces')).toBe(false);
    expect(matchesAccessCommandName('axcess')).toBe(false);
    expect(matchesAccessCommandName('aaaccess')).toBe(false);
  });
});
