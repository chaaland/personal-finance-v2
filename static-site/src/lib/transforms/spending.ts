/**
 * Spending calculations and transformations.
 * Mirrors Python transforms/spending.py
 */

import Decimal from 'decimal.js';
import { query } from '$lib/data/database';
import type { SpendingDetails } from '$lib/data/types';

interface CombinedSpendingRow {
  dates: Date;
  total_usd: number;
}

/**
 * Get combined US and UK spending with USD values.
 */
export async function getCombinedSpending(): Promise<CombinedSpendingRow[]> {
  const sql = `
    SELECT
      dates,
      SUM(total_usd) AS total_usd
    FROM (
      SELECT dates, total * conversion AS total_usd FROM us_spend
      UNION ALL
      SELECT dates, total * conversion AS total_usd FROM uk_spend
    )
    GROUP BY dates
    ORDER BY dates
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
export async function getYtdSpending(): Promise<Decimal> {
  const sql = `
    WITH current_year AS (
      SELECT EXTRACT(YEAR FROM MAX(dates)) AS year
      FROM (SELECT dates FROM us_spend UNION ALL SELECT dates FROM uk_spend)
    )
    SELECT SUM(total_usd) AS ytd_spend
    FROM (
      SELECT dates, total * conversion AS total_usd FROM us_spend
      UNION ALL
      SELECT dates, total * conversion AS total_usd FROM uk_spend
    ), current_year
    WHERE EXTRACT(YEAR FROM dates) = current_year.year
  `;

  const rows = await query<{ ytd_spend: number }>(sql);
  if (rows.length === 0 || rows[0].ytd_spend === null) {
    return new Decimal(0);
  }
  return new Decimal(rows[0].ytd_spend);
}

/**
 * Get projected annual spend based on YTD spending.
 * Formula: (YTD spend) * (12 / months_elapsed)
 */
export async function getProjectedAnnualSpend(): Promise<Decimal> {
  const sql = `
    WITH combined AS (
      SELECT dates, total * conversion AS total_usd FROM us_spend
      UNION ALL
      SELECT dates, total * conversion AS total_usd FROM uk_spend
    ),
    current_info AS (
      SELECT
        MAX(dates) AS max_date,
        EXTRACT(YEAR FROM MAX(dates)) AS current_year,
        EXTRACT(MONTH FROM MAX(dates)) AS months_elapsed
      FROM combined
    ),
    ytd AS (
      SELECT SUM(total_usd) AS ytd_spend
      FROM combined, current_info
      WHERE EXTRACT(YEAR FROM dates) = current_info.current_year
    )
    SELECT
      CASE
        WHEN current_info.months_elapsed = 0 THEN 0
        ELSE ytd.ytd_spend * 12.0 / current_info.months_elapsed
      END AS projected_annual
    FROM ytd, current_info
  `;

  const rows = await query<{ projected_annual: number }>(sql);
  if (rows.length === 0 || rows[0].projected_annual === null) {
    return new Decimal(0);
  }
  return new Decimal(rows[0].projected_annual);
}

/**
 * Get total spending for the previous full year.
 */
export async function getPreviousYearSpending(): Promise<Decimal> {
  const sql = `
    WITH combined AS (
      SELECT dates, total * conversion AS total_usd FROM us_spend
      UNION ALL
      SELECT dates, total * conversion AS total_usd FROM uk_spend
    ),
    previous_year AS (
      SELECT EXTRACT(YEAR FROM MAX(dates)) - 1 AS year FROM combined
    )
    SELECT SUM(total_usd) AS prev_year_spend
    FROM combined, previous_year
    WHERE EXTRACT(YEAR FROM dates) = previous_year.year
  `;

  const rows = await query<{ prev_year_spend: number }>(sql);
  if (rows.length === 0 || rows[0].prev_year_spend === null) {
    return new Decimal(0);
  }
  return new Decimal(rows[0].prev_year_spend);
}

/**
 * Compare projected current year spend to previous year.
 * Returns [absolute_difference, percentage_difference]
 */
export async function getYoySpendingComparison(): Promise<[Decimal, Decimal]> {
  const projected = await getProjectedAnnualSpend();
  const previous = await getPreviousYearSpending();

  if (previous.isZero()) {
    return [projected, new Decimal(0)];
  }

  const absoluteDiff = projected.minus(previous);
  const percentageDiff = absoluteDiff.div(previous).mul(100);

  return [absoluteDiff, percentageDiff];
}

/**
 * Get detailed spending projection info.
 */
export async function getSpendingProjectionDetails(): Promise<SpendingDetails> {
  const sql = `
    WITH combined AS (
      SELECT dates, total * conversion AS total_usd FROM us_spend
      UNION ALL
      SELECT dates, total * conversion AS total_usd FROM uk_spend
    ),
    current_info AS (
      SELECT
        MAX(dates) AS max_date,
        EXTRACT(YEAR FROM MAX(dates)) AS current_year,
        EXTRACT(MONTH FROM MAX(dates)) AS months_elapsed
      FROM combined
    )
    SELECT
      current_info.current_year,
      current_info.months_elapsed
    FROM current_info
  `;

  const rows = await query<{ current_year: number; months_elapsed: number }>(sql);
  const currentYear = rows.length > 0 ? rows[0].current_year : new Date().getFullYear();
  const monthsElapsed = rows.length > 0 ? rows[0].months_elapsed : 1;

  const ytdSpend = await getYtdSpending();
  const projected = await getProjectedAnnualSpend();
  const previous = await getPreviousYearSpending();
  const [change, changePct] = await getYoySpendingComparison();

  return {
    projectedValue: projected.toNumber(),
    currentYear,
    previousValue: previous.toNumber(),
    previousYear: currentYear - 1,
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
  return `Based on $${details.ytdSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })} spent over ${details.monthsElapsed} ${monthWord}, projecting $${details.projectedValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} vs $${details.previousValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} in ${details.previousYear}`;
}
