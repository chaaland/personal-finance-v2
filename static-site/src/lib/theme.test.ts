import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withAlpha } from './theme.ts';

describe('withAlpha', () => {
  it('turns a 6-digit hex color into rgba with the given opacity', () => {
    assert.equal(withAlpha('#D4A853', 0.3), 'rgba(212, 168, 83, 0.3)');
    assert.equal(withAlpha('#b07a1a', 0.22), 'rgba(176, 122, 26, 0.22)');
  });

  it('rejects anything that is not a 6-digit hex color', () => {
    assert.throws(() => withAlpha('rgba(1, 2, 3, 0.5)', 0.3), /hex/);
    assert.throws(() => withAlpha('#fff', 0.3), /hex/);
  });
});
