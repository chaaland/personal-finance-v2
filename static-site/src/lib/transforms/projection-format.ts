/**
 * Text for the FIRE projection: what each card and chart note says about the result.
 * Kept free of `$lib` aliases so it can be unit-tested with `npm test`.
 */

import { formatUsd } from '../theme.ts';
import type { FireDateEstimate, ProjectionAssumptions } from '../data/types.ts';

const HORIZON_TEXT = '30 years';

/** "Sep 2029". UTC, because the engine's dates are UTC and a local month could differ. */
export function monthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Headline for a FIRE date card. */
export function formatFireDate(estimate: FireDateEstimate): string {
  if (estimate.alreadyThere) return 'FIRE Ready';
  if (estimate.medianDate === null) return `Beyond ${HORIZON_TEXT}`;
  return monthYear(estimate.medianDate);
}

/** One-line explanation of the likely range around the headline. */
export function formatFireRange(estimate: FireDateEstimate): string {
  if (estimate.alreadyThere) return 'Target reached!';
  if (estimate.medianDate === null || estimate.medianYears === null || estimate.earlyDate === null) {
    return estimate.probability === 0
      ? `Not reached in any simulation within ${HORIZON_TEXT}`
      : `Reached in ${Math.round(estimate.probability * 100)}% of simulations within ${HORIZON_TEXT}`;
  }
  const late = estimate.lateDate === null ? `beyond ${HORIZON_TEXT}` : monthYear(estimate.lateDate);
  return `About ${estimate.medianYears.toFixed(1)} years at the median; likely ${monthYear(estimate.earlyDate)} to ${late} (10th–90th percentile)`;
}

/** What the projection assumed, in a sentence. */
export function formatAssumptions(a: ProjectionAssumptions): string {
  const source = a.volatilitySource === 'data' ? 'from your history' : 'default; not enough history';
  return `Assumes a ${(a.expectedRealReturn * 100).toFixed(1)}% real return, ${(a.volatility * 100).toFixed(1)}% volatility (${source}) and ${formatUsd(a.annualSavings)} saved per year`;
}
