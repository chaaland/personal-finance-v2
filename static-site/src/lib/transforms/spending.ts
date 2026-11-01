/**
 * Spending calculations and transformations.
 */

import Decimal from 'decimal.js';
import { query, queryDecimal } from '$lib/data/database';
import { formatUsd } from '$lib/theme';
import { compareToPrevious } from './compare';
import type { SpendingDetails, MonthlySpendingRow, SpendingByYear } from '$lib/data/types';

interface CombinedSpendingRow {
  dates: Date;
  total_usd: number;
}

/**
 * Latest year present in the spending data. Reused as a subquery below.
 */
const LATEST_SPEND_YEAR = `(SELECT EXTRACT(YEAR FROM MAX(dates)) FROM all_spend)`;

/**
 * Get combined US and UK spending with USD values.
 */
async function getCombinedSpending(): Promise<CombinedSpendingRow[]> {
  const sql = `
    WITH combined AS (
      SELECT dates, SUM(total_usd) AS total_usd
      FROM all_spend
      GROUP BY dates
    ),
    first_spend AS (
      SELECT MIN(dates) AS first_date FROM combined WHERE total_usd > 0
    )
    SELECT combined.dates, combined.total_usd
    FROM combined, first_spend
    WHERE combined.dates >= first_spend.first_date
    ORDER BY combined.dates
  `;

  const rows = await query<CombinedSpendingRow>(sql);
  return rows.map((row) => ({
    dates: new Date(row.dates),
    total_usd: Number(row.total_usd),
  }));
}

/**
 * Get year-to-date spending total in USD.
 */
async function getYtdSpending(): Promise<Decimal> {
  return queryDecimal(`
    SELECT SUM(total_usd) FROM all_spend
    WHERE EXTRACT(YEAR FROM dates) = ${LATEST_SPEND_YEAR}
  `);
}

/**
 * Get projected annual spend based on YTD spending.
 * Formula: (YTD spend) * (12 / months_elapsed)
 */
export async function getProjectedAnnualSpend(): Promise<Decimal> {
  const [ytd, monthsElapsed] = await Promise.all([getYtdSpending(), getMonthsElapsed()]);
  return monthsElapsed === 0 ? new Decimal(0) : ytd.mul(12).div(monthsElapsed);
}

/**
 * Get total spending for the previous full year.
 */
export async function getPreviousYearSpending(): Promise<Decimal> {
  return queryDecimal(`
    SELECT SUM(total_usd) FROM all_spend
    WHERE EXTRACT(YEAR FROM dates) = ${LATEST_SPEND_YEAR} - 1
  `);
}

/**
 * Month number (1-12) of the latest spending record, i.e. how much of the
 * current year the data covers. 0 when there is no data.
 */
async function getMonthsElapsed(): Promise<number> {
  return (await queryDecimal(`SELECT EXTRACT(MONTH FROM MAX(dates)) FROM all_spend`)).toNumber();
}

/**
 * Compare projected current year spend to previous year.
 * Returns [absolute_difference, percentage_difference]
 */
export async function getYoySpendingComparison(): Promise<[Decimal, Decimal]> {
  const [projected, previous] = await Promise.all([
    getProjectedAnnualSpend(),
    getPreviousYearSpending(),
  ]);
  return compareToPrevious(projected, previous);
}

/**
 * Get detailed spending projection info.
 */
export async function getSpendingProjectionDetails(): Promise<SpendingDetails> {
  const [currentYear, monthsElapsed, ytdSpend, previous] = await Promise.all([
    queryDecimal(`SELECT ${LATEST_SPEND_YEAR}`),
    getMonthsElapsed(),
    getYtdSpending(),
    getPreviousYearSpending(),
  ]);
  const projected = monthsElapsed === 0 ? new Decimal(0) : ytdSpend.mul(12).div(monthsElapsed);
  const [change, changePct] = compareToPrevious(projected, previous);
  const year = currentYear.toNumber() || new Date().getFullYear();

  return {
    projectedValue: projected.toNumber(),
    currentYear: year,
    previousValue: previous.toNumber(),
    previousYear: year - 1,
    ytdSpend: ytdSpend.toNumber(),
    monthsElapsed,
    change: change.toNumber(),
    changePct: changePct.toNumber(),
  };
}

/**
 * Format explanation text for spending projection.
 */
export function formatSpendingExplanation(details: SpendingDetails): string {
  const monthWord = details.monthsElapsed === 1 ? 'month' : 'months';
  return `Based on ${formatUsd(details.ytdSpend)} spent over ${details.monthsElapsed} ${monthWord}, projecting ${formatUsd(details.projectedValue)} vs ${formatUsd(details.previousValue)} in ${details.previousYear}`;
}

/**
 * Get monthly spending with rolling median.
 * Uses a 4-month (120 day) rolling window for the median calculation.
 *
 * Since DuckDB-WASM doesn't support window functions with RANGE for dates,
 * we compute the rolling median in JavaScript.
 */
export async function getMonthlySpendingWithMedian(
  windowMonths: number = 4
): Promise<MonthlySpendingRow[]> {
  const rows = await getCombinedSpending();

  if (rows.length === 0) {
    return [];
  }

  // Helper to compute median
  function median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Compute rolling median with windowMonths lookback
  const result: MonthlySpendingRow[] = [];
  const windowMs = windowMonths * 30 * 24 * 60 * 60 * 1000; // Approximate months in ms

  for (let i = 0; i < rows.length; i++) {
    const currentDate = rows[i].dates;
    const windowStart = new Date(currentDate.getTime() - windowMs);

    // Collect values within the window
    const windowValues: number[] = [];
    for (let j = 0; j <= i; j++) {
      if (rows[j].dates >= windowStart && rows[j].dates <= currentDate) {
        windowValues.push(rows[j].total_usd);
      }
    }

    result.push({
      dates: currentDate,
      totalUsd: rows[i].total_usd,
      medianUsd: windowValues.length > 0 ? median(windowValues) : null,
    });
  }

  return result;
}

/**
 * Get total spending per year in USD.
 */
export async function getSpendingByYear(): Promise<SpendingByYear[]> {
  const sql = `
    WITH by_year AS (
      SELECT
        EXTRACT(YEAR FROM dates)::INTEGER AS year,
        SUM(total_usd) AS total_usd
      FROM all_spend
      GROUP BY EXTRACT(YEAR FROM dates)
    ),
    first_year AS (
      SELECT MIN(year) AS year FROM by_year WHERE total_usd > 0
    )
    SELECT by_year.year, by_year.total_usd
    FROM by_year, first_year
    WHERE by_year.year >= first_year.year
    ORDER BY by_year.year
  `;

  const rows = await query<{ year: number; total_usd: number }>(sql);
  return rows.map((row) => ({
    year: row.year,
    totalUsd: Number(row.total_usd),
  }));
}
