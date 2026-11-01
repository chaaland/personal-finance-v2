import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EXPECTED_RETURN,
  EXPECTED_RETURN_MIN,
  EXPECTED_RETURN_MAX,
  stepExpectedReturn,
  parseStoredExpectedReturn,
} from './expected-return.ts';

describe('expected real return limits', () => {
  it('defaults to 5% within 2%-9%', () => {
    assert.equal(DEFAULT_EXPECTED_RETURN, 0.05);
    assert.equal(EXPECTED_RETURN_MIN, 0.02);
    assert.equal(EXPECTED_RETURN_MAX, 0.09);
  });
});

describe('stepExpectedReturn', () => {
  it('moves in half-percent steps', () => {
    assert.equal(stepExpectedReturn(0.05, 1), 0.055);
    assert.equal(stepExpectedReturn(0.05, -1), 0.045);
  });

  it('does not accumulate floating point error over many steps', () => {
    let value = EXPECTED_RETURN_MIN;
    for (let i = 0; i < 14; i++) value = stepExpectedReturn(value, 1);
    assert.equal(value, 0.09); // exactly, not 0.08999999999999998
  });

  it('stops at the limits', () => {
    assert.equal(stepExpectedReturn(0.09, 1), 0.09);
    assert.equal(stepExpectedReturn(0.02, -1), 0.02);
  });
});

describe('parseStoredExpectedReturn', () => {
  it('reads a valid stored value', () => {
    assert.equal(parseStoredExpectedReturn('0.065'), 0.065);
  });

  it('falls back to the default when nothing is stored', () => {
    assert.equal(parseStoredExpectedReturn(null), 0.05);
  });

  it('falls back to the default for garbage or out-of-range values', () => {
    assert.equal(parseStoredExpectedReturn('abc'), 0.05);
    assert.equal(parseStoredExpectedReturn('0.5'), 0.05);
    assert.equal(parseStoredExpectedReturn('-0.01'), 0.05);
  });

  it('snaps a stored value to the nearest step', () => {
    assert.equal(parseStoredExpectedReturn('0.0524'), 0.05);
    assert.equal(parseStoredExpectedReturn('0.0526'), 0.055);
  });
});
