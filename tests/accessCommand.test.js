import { describe, expect, test } from 'vitest';
import { isAccessCommand } from '../static/js/accessCommand.js';

describe('isAccessCommand', () => {
  test.each([
    'access',
    'Access',
    'ACCESS',
    'aAccess',
  ])('accepts %s', (value) => {
    expect(isAccessCommand(value)).toBe(true);
  });

  test.each([
    'acces',
    'axcess',
    'aaaccess',
  ])('rejects %s', (value) => {
    expect(isAccessCommand(value)).toBe(false);
  });
});
