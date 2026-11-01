/**
 * Shared comparison helpers for the transform modules.
 */

import Decimal from 'decimal.js';

/**
 * Compare a current figure to its previous-period counterpart.
 * Returns [absolute_difference, percentage_difference]. With nothing to compare
 * against, the whole current figure is the difference and the percentage is 0.
 */
export function compareToPrevious(current: Decimal, previous: Decimal): [Decimal, Decimal] {
  if (previous.isZero()) {
    return [current, new Decimal(0)];
  }
  const absoluteDiff = current.minus(previous);
  return [absoluteDiff, absoluteDiff.div(previous).mul(100)];
}
