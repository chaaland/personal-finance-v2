/**
 * Income calculations and transformations.
 */

import Decimal from 'decimal.js';
import { query, queryDecimal } from '$lib/data/database';
import { formatUsd } from '$lib/theme';
import { compareToPrevious } from './compare';
import type { IncomeDetails, IncomeByYear } from '$lib/data/types';

type CompColumn = 'gross' | 'net';

/** Latest year / month present in the paycheck data. Reused as subqueries below. */
const LATEST_YEAR = `(SELECT EXTRACT(YEAR FROM MAX(dates)) FROM total_comp)`;
const LATEST_MONTH = `(SELECT EXTRACT(MONTH FROM MAX(dates)) FROM total_comp)`;

/**
 * Year-to-date income in USD for the latest year in the data.
 */
function getYtdIncome(column: CompColumn): Promise<Decimal> {
  return queryDecimal(`
    SELECT SUM(${column} * conversion) FROM total_comp
    WHERE EXTRACT(YEAR FROM dates) = ${LATEST_YEAR}
  `);
}

/**
 * Income in USD for the same months of the previous year as the latest year's YTD.
 */
function getPreviousYtdIncome(column: CompColumn): Promise<Decimal> {
  return queryDecimal(`
    SELECT SUM(${column} * conversion) FROM total_comp
    WHERE EXTRACT(YEAR FROM dates) = ${LATEST_YEAR} - 1
      AND EXTRACT(MONTH FROM dates) <= ${LATEST_MONTH}
  `);
}

/**
 * Compare YTD income to the same period last year.
 * Returns [absolute_difference, percentage_difference]
 */
async function getYoyComparison(column: CompColumn): Promise<[Decimal, Decimal]> {
  const [current, previous] = await Promise.all([
    getYtdIncome(column),
    getPreviousYtdIncome(column),
  ]);
  return compareToPrevious(current, previous);
}

export const getYtdGrossIncome = () => getYtdIncome('gross');
export const getYtdNetIncome = () => getYtdIncome('net');
export const getYoyIncomeComparison = () => getYoyComparison('gross');
export const getYoyNetIncomeComparison = () => getYoyComparison('net');

/**
 * Get detailed YTD income info for display.
 */
export async function getYtdIncomeDetails(): Promise<IncomeDetails> {
  const [ytdGross, ytdNet, previousYtdGross] = await Promise.all([
    getYtdIncome('gross'),
    getYtdIncome('net'),
    getPreviousYtdIncome('gross'),
  ]);
  const [change, changePct] = compareToPrevious(ytdGross, previousYtdGross);

  return {
    ytdGross: ytdGross.toNumber(),
    ytdNet: ytdNet.toNumber(),
    previousYtdGross: previousYtdGross.toNumber(),
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
  return `${direction} ${formatUsd(absChange)} vs same period last year (${formatUsd(details.previousYtdGross)})`;
}

/**
 * Get gross and net income per year in USD.
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

  const rows = await query<{ year: number; gross_usd: number; net_usd: number }>(sql);

  return rows.map((row) => ({
    year: row.year,
    grossUsd: Number(row.gross_usd),
    netUsd: Number(row.net_usd),
  }));
}
