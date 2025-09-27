import { describe, expect, it } from 'vitest';
import { ACCESS_COMMAND_PATTERN, matchesAccessCommand } from '../static/js/commands/access.js';

describe('access command matching', () => {
  it('accepts expected variants', () => {
    ['access', 'Access', 'ACCESS', 'aAccess'].forEach((value) => {
      expect(matchesAccessCommand(value)).toBe(true);
      expect(ACCESS_COMMAND_PATTERN.test(value)).toBe(true);
    });
  });

  it('rejects invalid variants', () => {
    ['acces', 'axcess', 'aaaccess'].forEach((value) => {
      expect(matchesAccessCommand(value)).toBe(false);
      expect(ACCESS_COMMAND_PATTERN.test(value)).toBe(false);
    });
  });
});
