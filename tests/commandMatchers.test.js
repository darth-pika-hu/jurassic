import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAccessCommandName } from '../static/js/commandMatchers.js';

describe('isAccessCommandName', () => {
  it('accepts tolerated variants', () => {
    ['access', 'Access', 'ACCESS', 'aAccess'].forEach((value) => {
      assert.strictEqual(isAccessCommandName(value), true, `${value} should be accepted`);
    });
  });

  it('rejects invalid inputs', () => {
    ['acces', 'axcess', 'aaaccess', ''].forEach((value) => {
      assert.strictEqual(isAccessCommandName(value), false, `${value} should be rejected`);
    });
  });
});
