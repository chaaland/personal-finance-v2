/**
 * Limits and parsing for the "expected real return" setting. Plain functions (no runes) so
 * they can be unit-tested with `npm test`; settings.svelte.ts holds the reactive state.
 */

export const DEFAULT_EXPECTED_RETURN = 0.05;
export const EXPECTED_RETURN_MIN = 0.02;
export const EXPECTED_RETURN_MAX = 0.09;
export const EXPECTED_RETURN_STEP = 0.005;

/** Round to the nearest step (in thousandths, to avoid 0.08999999999999998-style drift). */
function snap(value: number): number {
  return Math.round(value / EXPECTED_RETURN_STEP) * Math.round(EXPECTED_RETURN_STEP * 1000) / 1000;
}

/** One step up (direction 1) or down (-1), stopping at the limits. */
export function stepExpectedReturn(current: number, direction: 1 | -1): number {
  const next = snap(current) + direction * EXPECTED_RETURN_STEP;
  return Math.min(EXPECTED_RETURN_MAX, Math.max(EXPECTED_RETURN_MIN, snap(next)));
}

/** A stored value if it is a number within range (snapped to a step); otherwise the default. */
export function parseStoredExpectedReturn(stored: string | null): number {
  if (stored === null) return DEFAULT_EXPECTED_RETURN;
  const value = Number(stored);
  if (!Number.isFinite(value) || value < EXPECTED_RETURN_MIN || value > EXPECTED_RETURN_MAX) {
    return DEFAULT_EXPECTED_RETURN;
  }
  return snap(value);
}
