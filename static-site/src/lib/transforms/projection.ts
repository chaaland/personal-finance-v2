/**
 * FIRE projection: loads the monthly series from DuckDB, estimates savings and volatility,
 * and runs the Monte Carlo engine (projection-engine.ts).
 *
 * Model, monthly in today's dollars:  NW' = NW * (1 + R) + c
 *   c      trailing 12 months of take-home minus spending (flat)
 *   R      lognormal, mean = the expected real return setting
 *   sigma  from returns implied by net worth changes once savings are removed
 * FIRE is reached in the first month net worth >= the goal.
 */

import type Decimal from 'decimal.js';
import { query } from '$lib/data/database';
import { getCombinedNetworth } from './networth';
import {
  addMonths,
  chartHorizonMonths,
  estimateAnnualSavings,
  estimateVolatility,
  impliedMonthlyReturns,
  monthEndNetWorth,
  savingsByMonth,
  simulate,
  type HitStats,
} from './projection-engine';
import type { FireDateEstimate, FireProjection, SwrSensitivityRow } from '$lib/data/types';

const SWR_RATES = [0.03, 0.035, 0.04, 0.045];
/** The goal setting corresponds to this withdrawal rate; other rates scale it. */
const BASE_SWR = 0.04;

async function totalsByMonth(sql: string): Promise<Record<string, number>> {
  const rows = await query<{ month: string; value: number }>(sql);
  return Object.fromEntries(rows.map((row) => [row.month, Number(row.value)]));
}

function toEstimate(hit: HitStats, startDate: Date): FireDateEstimate {
  const dateAt = (months: number | null) => (months === null ? null : addMonths(startDate, months));
  return {
    alreadyThere: hit.alreadyThere,
    earlyDate: dateAt(hit.early),
    medianDate: dateAt(hit.median),
    lateDate: dateAt(hit.late),
    medianYears: hit.median === null ? null : hit.median / 12,
    probability: hit.probability,
  };
}

/**
 * Project when net worth reaches `fireGoal` (in today's dollars), as a median date with a
 * 10th-90th percentile range, plus the same for the other withdrawal rates and a net worth band
 * for the chart.
 * @param expectedRealReturn Expected annual return after inflation, e.g. 0.05
 */
export async function getFireProjection(
  fireGoal: Decimal,
  expectedRealReturn: number
): Promise<FireProjection> {
  const [takeHome, spend, ukStart, combined] = await Promise.all([
    totalsByMonth(`
      SELECT strftime(dates, '%Y-%m') AS month, SUM((net + pension_contrib) * conversion) AS value
      FROM total_comp GROUP BY 1
    `),
    totalsByMonth(`
      SELECT strftime(dates, '%Y-%m') AS month, SUM(total_usd) AS value
      FROM all_spend GROUP BY 1
    `),
    query<{ month: string | null }>(`SELECT strftime(MIN(dates), '%Y-%m') AS month FROM uk_networth`),
    getCombinedNetworth(),
  ]);

  // Savings, and volatility from the returns implied once savings are removed. Months before UK
  // balances first appear are skipped: that step in the combined series would read as a return.
  const { months, byMonth } = savingsByMonth(takeHome, spend);
  const annualSavings = estimateAnnualSavings(months.map((month) => byMonth[month]));
  const netWorthByMonth = monthEndNetWorth(combined.map((row) => ({ date: row.dates, value: row.totalUsd })));
  const volatility = estimateVolatility(impliedMonthlyReturns(netWorthByMonth, byMonth, ukStart[0]?.month ?? undefined));

  const latest = combined[combined.length - 1];
  const startNetWorth = latest?.totalUsd ?? 0;
  const startDate = latest?.dates ?? new Date();
  const goal = fireGoal.toNumber();

  const goals = [goal, ...SWR_RATES.map((rate) => (goal * BASE_SWR) / rate)];
  const result = simulate({
    startNetWorth,
    annualSavings,
    expectedRealReturn,
    volatility: volatility.value,
    goals,
  });

  const [main, ...bySwr] = result.hits;
  const bands = result.bands(chartHorizonMonths(main.median));

  const swr: SwrSensitivityRow[] = SWR_RATES.map((rate, i) => ({
    swr: `${(rate * 100).toFixed(1)}%`,
    estimate: toEstimate(bySwr[i], startDate),
  }));

  return {
    assumptions: {
      startNetWorth,
      annualSavings,
      expectedRealReturn,
      volatility: volatility.value,
      volatilitySource: volatility.source,
      goal,
    },
    estimate: toEstimate(main, startDate),
    swr,
    band: {
      dates: bands.p50.map((_, month) => addMonths(startDate, month)),
      p10: bands.p10,
      p50: bands.p50,
      p90: bands.p90,
    },
  };
}
