/**
 * Income calculations and transformations.
 * Mirrors Python transforms/income.py
 */

import Decimal from 'decimal.js';
import { query } from '$lib/data/database';
import type { IncomeDetails, IncomeByYear } from '$lib/data/types';

interface YtdIncomeRow {
  ytd_gross: number;
  ytd_net: number;
}

interface YoyComparisonRow {
  current_ytd: number;
  previous_ytd: number;
}

/**
 * Get year-to-date gross income in USD.
 */
export async function getYtdGrossIncome(): Promise<Decimal> {
  const sql = `
    WITH current_year AS (
      SELECT EXTRACT(YEAR FROM MAX(dates)) AS year FROM total_comp
    )
    SELECT
      SUM(gross * conversion) AS ytd_gross
    FROM total_comp, current_year
    WHERE EXTRACT(YEAR FROM dates) = current_year.year
  `;

  const rows = await query<YtdIncomeRow>(sql);
  if (rows.length === 0 || rows[0].ytd_gross === null) {
    return new Decimal(0);
  }
  return new Decimal(rows[0].ytd_gross);
}

/**
 * Get year-to-date net income in USD.
 */
export async function getYtdNetIncome(): Promise<Decimal> {
  const sql = `
    WITH current_year AS (
      SELECT EXTRACT(YEAR FROM MAX(dates)) AS year FROM total_comp
    )
    SELECT
      SUM(net * conversion) AS ytd_net
    FROM total_comp, current_year
    WHERE EXTRACT(YEAR FROM dates) = current_year.year
  `;

  const rows = await query<{ ytd_net: number }>(sql);
  if (rows.length === 0 || rows[0].ytd_net === null) {
    return new Decimal(0);
  }
  return new Decimal(rows[0].ytd_net);
}

/**
 * Compare YTD income to same period last year.
 * Returns [absolute_difference, percentage_difference]
 */
export async function getYoyIncomeComparison(): Promise<[Decimal, Decimal]> {
  // Get current YTD and the month we're in
  const sql = `
    WITH current_info AS (
      SELECT
        EXTRACT(YEAR FROM MAX(dates)) AS current_year,
        EXTRACT(MONTH FROM MAX(dates)) AS current_month
      FROM total_comp
    ),
    current_ytd AS (
      SELECT SUM(gross * conversion) AS total
      FROM total_comp, current_info
      WHERE EXTRACT(YEAR FROM dates) = current_info.current_year
    ),
    previous_ytd AS (
      SELECT SUM(gross * conversion) AS total
      FROM total_comp, current_info
      WHERE EXTRACT(YEAR FROM dates) = current_info.current_year - 1
        AND EXTRACT(MONTH FROM dates) <= current_info.current_month
    )
    SELECT
      COALESCE(current_ytd.total, 0) AS current_ytd,
      COALESCE(previous_ytd.total, 0) AS previous_ytd
    FROM current_ytd, previous_ytd
  `;

  const rows = await query<YoyComparisonRow>(sql);
  if (rows.length === 0) {
    return [new Decimal(0), new Decimal(0)];
  }

  const current = new Decimal(rows[0].current_ytd || 0);
  const previous = new Decimal(rows[0].previous_ytd || 0);

  if (previous.isZero()) {
    return [current, new Decimal(0)];
  }

  const absoluteDiff = current.minus(previous);
  const percentageDiff = absoluteDiff.div(previous).mul(100);

  return [absoluteDiff, percentageDiff];
}

/**
 * Compare YTD net income to same period last year.
 * Returns [absolute_difference, percentage_difference]
 */
export async function getYoyNetIncomeComparison(): Promise<[Decimal, Decimal]> {
  const sql = `
    WITH current_info AS (
      SELECT
        EXTRACT(YEAR FROM MAX(dates)) AS current_year,
        EXTRACT(MONTH FROM MAX(dates)) AS current_month
      FROM total_comp
    ),
    current_ytd AS (
      SELECT SUM(net * conversion) AS total
      FROM total_comp, current_info
      WHERE EXTRACT(YEAR FROM dates) = current_info.current_year
    ),
    previous_ytd AS (
      SELECT SUM(net * conversion) AS total
      FROM total_comp, current_info
      WHERE EXTRACT(YEAR FROM dates) = current_info.current_year - 1
        AND EXTRACT(MONTH FROM dates) <= current_info.current_month
    )
    SELECT
      COALESCE(current_ytd.total, 0) AS current_ytd,
      COALESCE(previous_ytd.total, 0) AS previous_ytd
    FROM current_ytd, previous_ytd
  `;

  const rows = await query<YoyComparisonRow>(sql);
  if (rows.length === 0) {
    return [new Decimal(0), new Decimal(0)];
  }

  const current = new Decimal(rows[0].current_ytd || 0);
  const previous = new Decimal(rows[0].previous_ytd || 0);

  if (previous.isZero()) {
    return [current, new Decimal(0)];
  }

  const absoluteDiff = current.minus(previous);
  const percentageDiff = absoluteDiff.div(previous).mul(100);

  return [absoluteDiff, percentageDiff];
}

/**
 * Get detailed YTD income info for display.
 */
export async function getYtdIncomeDetails(): Promise<IncomeDetails> {
  const ytdGross = await getYtdGrossIncome();
  const ytdNet = await getYtdNetIncome();
  const [change, changePct] = await getYoyIncomeComparison();

  // Get previous year's YTD for the same period
  const sql = `
    WITH current_info AS (
      SELECT
        EXTRACT(YEAR FROM MAX(dates)) AS current_year,
        EXTRACT(MONTH FROM MAX(dates)) AS current_month
      FROM total_comp
    )
    SELECT SUM(gross * conversion) AS previous_ytd_gross
    FROM total_comp, current_info
    WHERE EXTRACT(YEAR FROM dates) = current_info.current_year - 1
      AND EXTRACT(MONTH FROM dates) <= current_info.current_month
  `;

  const rows = await query<{ previous_ytd_gross: number }>(sql);
  const previousYtdGross = rows.length > 0 && rows[0].previous_ytd_gross
    ? rows[0].previous_ytd_gross
    : 0;

  return {
    ytdGross: ytdGross.toNumber(),
    ytdNet: ytdNet.toNumber(),
    previousYtdGross,
    change: change.toNumber(),
    changePct: changePct.toNumber(),
  };
}

/**
 * Format explanation text for income details.
 */
export function formatIncomeExplanation(details: IncomeDetails): string {
  const direction = details.change >= 0 ? 'Up' : 'Down';
  const absChange = Math.abs(details.change);
  return `${direction} $${absChange.toLocaleString('en-US', { maximumFractionDigits: 0 })} vs same period last year ($${details.previousYtdGross.toLocaleString('en-US', { maximumFractionDigits: 0 })})`;
}

interface IncomeByYearRow {
  year: number;
  gross_usd: number;
  net_usd: number;
}

/**
 * Get gross and net income per year in USD.
 * Mirrors Python transforms/income.py get_income_by_year()
 */
export async function getIncomeByYear(): Promise<IncomeByYear[]> {
  const sql = `
    SELECT
      EXTRACT(YEAR FROM dates)::INTEGER AS year,
      SUM(gross * conversion) AS gross_usd,
      SUM(net * conversion) AS net_usd
    FROM total_comp
    GROUP BY EXTRACT(YEAR FROM dates)
    ORDER BY year
  `;

  const rows = await query<IncomeByYearRow>(sql);

  return rows.map((row) => ({
    year: row.year,
    grossUsd: Number(row.gross_usd),
    netUsd: Number(row.net_usd),
  }));
}
