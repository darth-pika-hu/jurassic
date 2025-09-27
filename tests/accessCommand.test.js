import { describe, expect, it } from 'vitest';
import { isAccessKeyword } from '../src/jurassicSystems/commandUtils.js';

describe('isAccessKeyword', () => {
  it('accepts lower-case access', () => {
    expect(isAccessKeyword('access')).toBe(true);
  });

  it('accepts mixed-case variants of access', () => {
    expect(isAccessKeyword('Access')).toBe(true);
    expect(isAccessKeyword('ACCESS')).toBe(true);
  });

  it('accepts leading a variants', () => {
    expect(isAccessKeyword('aAccess')).toBe(true);
    expect(isAccessKeyword('aaccess')).toBe(true);
  });

  it('rejects near matches', () => {
    expect(isAccessKeyword('acces')).toBe(false);
    expect(isAccessKeyword('axcess')).toBe(false);
  });
});
