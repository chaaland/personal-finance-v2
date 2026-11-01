/**
 * Savings rate calculations and transformations.
 */

import Decimal from 'decimal.js';
import { query, queryDecimal } from '$lib/data/database';
import { formatUsd } from '$lib/theme';
import type { SavingsRateDetails, SavingsRateByYear } from '$lib/data/types';

/**
 * Year of the latest paycheck. Take-home and spending are both measured against
 * this year so the savings rate always compares like with like.
 */
const LATEST_COMP_YEAR = `(SELECT EXTRACT(YEAR FROM MAX(dates)) FROM total_comp)`;

/**
 * Get take-home pay (net + pension contrib) for the latest year, or the year
 * `yearsBack` before it.
 */
function getTakeHome(yearsBack: number): Promise<Decimal> {
  return queryDecimal(`
    SELECT SUM((net + pension_contrib) * conversion) FROM total_comp
    WHERE EXTRACT(YEAR FROM dates) = ${LATEST_COMP_YEAR} - ${yearsBack}
  `);
}

/**
 * Get total spending for the latest paycheck year, or the year `yearsBack` before it.
 */
function getSpending(yearsBack: number): Promise<Decimal> {
  return queryDecimal(`
    SELECT SUM(total_usd) FROM all_spend
    WHERE EXTRACT(YEAR FROM dates) = ${LATEST_COMP_YEAR} - ${yearsBack}
  `);
}

/**
 * Savings rate as a percentage of take-home pay (0 when there is no take-home pay).
 * Formula: ((Take_Home - Spending) / Take_Home) * 100
 */
function savingsRateOf(takeHome: Decimal, spending: Decimal): Decimal {
  if (takeHome.isZero()) {
    return new Decimal(0);
  }
  return takeHome.minus(spending).div(takeHome).mul(100);
}

/**
 * Get savings rate for current year.
 */
export async function getCurrentYearSavingsRate(): Promise<Decimal> {
  const [takeHome, spending] = await Promise.all([getTakeHome(0), getSpending(0)]);
  return savingsRateOf(takeHome, spending);
}

/**
 * Get detailed savings rate info for display.
 */
export async function getSavingsRateDetails(): Promise<SavingsRateDetails> {
  const [takeHome, spending, prevTakeHome, prevSpending] = await Promise.all([
    getTakeHome(0),
    getSpending(0),
    getTakeHome(1),
    getSpending(1),
  ]);
  const savingsRate = savingsRateOf(takeHome, spending);
  const previousRate = savingsRateOf(prevTakeHome, prevSpending);

  return {
    savingsRate: savingsRate.toNumber(),
    takeHome: takeHome.toNumber(),
    spending: spending.toNumber(),
    previousRate: previousRate.toNumber(),
    change: savingsRate.minus(previousRate).toNumber(),
  };
}

/**
 * Format explanation text for savings rate.
 */
export function formatSavingsExplanation(details: SavingsRateDetails): string {
  const savings = details.takeHome - details.spending;
  return `Saving ${formatUsd(savings)} of ${formatUsd(details.takeHome)} take-home pay (${details.previousRate.toFixed(1)}% last year)`;
}

/**
 * Get savings rate per year.
 * Formula: ((Take_Home - Spending) / Take_Home) * 100
 */
export async function getSavingsRateByYear(): Promise<SavingsRateByYear[]> {
  const sql = `
    WITH take_home_by_year AS (
      SELECT
        EXTRACT(YEAR FROM dates)::INTEGER AS year,
        SUM((net + pension_contrib) * conversion) AS take_home
      FROM total_comp
      GROUP BY EXTRACT(YEAR FROM dates)
    ),
    spending_by_year AS (
      SELECT
        EXTRACT(YEAR FROM dates)::INTEGER AS year,
        SUM(total_usd) AS spending
      FROM all_spend
      GROUP BY EXTRACT(YEAR FROM dates)
    )
    SELECT
      t.year,
      CASE
        WHEN t.take_home = 0 THEN 0
        ELSE ((t.take_home - COALESCE(s.spending, 0)) / t.take_home) * 100
      END AS savings_rate
    FROM take_home_by_year t
    LEFT JOIN spending_by_year s ON t.year = s.year
    ORDER BY t.year
  `;

  const rows = await query<{ year: number; savings_rate: number }>(sql);
  return rows.map((row) => ({
    year: row.year,
    savingsRate: Number(row.savings_rate),
  }));
}
