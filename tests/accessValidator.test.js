import { describe, expect, it } from 'vitest';
import { isAccessCommand } from '../static/js/modules/accessValidator.js';

describe('isAccessCommand', () => {
  it('accepts canonical access command', () => {
    expect(isAccessCommand('access')).toBe(true);
  });

  it('accepts mixed case variants', () => {
    expect(isAccessCommand('Access')).toBe(true);
    expect(isAccessCommand('ACCESS')).toBe(true);
  });

  it('accepts the tolerant leading a variant', () => {
    expect(isAccessCommand('aAccess')).toBe(true);
  });

  it('rejects near matches', () => {
    expect(isAccessCommand('acces')).toBe(false);
    expect(isAccessCommand('axcess')).toBe(false);
    expect(isAccessCommand('')).toBe(false);
    expect(isAccessCommand(null)).toBe(false);
  });
});
