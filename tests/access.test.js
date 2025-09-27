import { describe, expect, it } from 'vitest';
import { isAccessCommand } from '../static/js/modules/access.js';

describe('isAccessCommand', () => {
  it('accepts canonical command', () => {
    expect(isAccessCommand('access')).toBe(true);
  });

  it('accepts mixed case variants', () => {
    expect(isAccessCommand('Access')).toBe(true);
    expect(isAccessCommand('ACCESS')).toBe(true);
  });

  it('accepts aAccess prefix variant', () => {
    expect(isAccessCommand('aAccess')).toBe(true);
  });

  it('rejects misspellings', () => {
    expect(isAccessCommand('acces')).toBe(false);
    expect(isAccessCommand('axcess')).toBe(false);
    expect(isAccessCommand('')).toBe(false);
  });
});
