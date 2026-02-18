/**
 * Savings rate calculations and transformations.
 * Mirrors Python transforms/savings.py
 */

import Decimal from 'decimal.js';
import { query } from '$lib/data/database';
import type { SavingsRateDetails, SavingsRateByYear } from '$lib/data/types';

/**
 * Get take-home pay (net + pension contrib) for current year.
 */
async function getCurrentYearTakeHome(): Promise<Decimal> {
  const sql = `
    WITH current_year AS (
      SELECT EXTRACT(YEAR FROM MAX(dates)) AS year FROM total_comp
    )
    SELECT SUM((net + pension_contrib) * conversion) AS take_home
    FROM total_comp, current_year
    WHERE EXTRACT(YEAR FROM dates) = current_year.year
  `;

  const rows = await query<{ take_home: number }>(sql);
  if (rows.length === 0 || rows[0].take_home === null) {
    return new Decimal(0);
  }
  return new Decimal(rows[0].take_home);
}

/**
 * Get current year spending total.
 */
async function getCurrentYearSpending(): Promise<Decimal> {
  const sql = `
    WITH combined AS (
      SELECT dates, total * conversion AS total_usd FROM us_spend
      UNION ALL
      SELECT dates, total * conversion AS total_usd FROM uk_spend
    ),
    current_year AS (
      SELECT EXTRACT(YEAR FROM MAX(dates)) AS year FROM combined
    )
    SELECT SUM(total_usd) AS spending
    FROM combined, current_year
    WHERE EXTRACT(YEAR FROM dates) = current_year.year
  `;

  const rows = await query<{ spending: number }>(sql);
  if (rows.length === 0 || rows[0].spending === null) {
    return new Decimal(0);
  }
  return new Decimal(rows[0].spending);
}

/**
 * Get savings rate for current year.
 * Formula: ((Take_Home - Spending) / Take_Home) * 100
 */
export async function getCurrentYearSavingsRate(): Promise<Decimal> {
  const takeHome = await getCurrentYearTakeHome();
  const spending = await getCurrentYearSpending();

  if (takeHome.isZero()) {
    return new Decimal(0);
  }

  const savings = takeHome.minus(spending);
  return savings.div(takeHome).mul(100);
}

/**
 * Get previous year's savings rate.
 */
async function getPreviousYearSavingsRate(): Promise<Decimal> {
  const sql = `
    WITH current_year AS (
      SELECT EXTRACT(YEAR FROM MAX(dates)) AS year FROM total_comp
    ),
    prev_year_take_home AS (
      SELECT SUM((net + pension_contrib) * conversion) AS take_home
      FROM total_comp, current_year
      WHERE EXTRACT(YEAR FROM dates) = current_year.year - 1
    ),
    prev_year_spending AS (
      SELECT SUM(total_usd) AS spending
      FROM (
        SELECT dates, total * conversion AS total_usd FROM us_spend
        UNION ALL
        SELECT dates, total * conversion AS total_usd FROM uk_spend
      ), current_year
      WHERE EXTRACT(YEAR FROM dates) = current_year.year - 1
    )
    SELECT
      COALESCE(prev_year_take_home.take_home, 0) AS take_home,
      COALESCE(prev_year_spending.spending, 0) AS spending
    FROM prev_year_take_home, prev_year_spending
  `;

  const rows = await query<{ take_home: number; spending: number }>(sql);
  if (rows.length === 0 || rows[0].take_home === 0) {
    return new Decimal(0);
  }

  const takeHome = new Decimal(rows[0].take_home);
  const spending = new Decimal(rows[0].spending);
  const savings = takeHome.minus(spending);

  return savings.div(takeHome).mul(100);
}

/**
 * Get detailed savings rate info for display.
 */
export async function getSavingsRateDetails(): Promise<SavingsRateDetails> {
  const takeHome = await getCurrentYearTakeHome();
  const spending = await getCurrentYearSpending();
  const savingsRate = await getCurrentYearSavingsRate();
  const previousRate = await getPreviousYearSavingsRate();

  const change = savingsRate.minus(previousRate);

  return {
    savingsRate: savingsRate.toNumber(),
    takeHome: takeHome.toNumber(),
    spending: spending.toNumber(),
    previousRate: previousRate.toNumber(),
    change: change.toNumber(),
  };
}

/**
 * Format explanation text for savings rate.
 */
export function formatSavingsExplanation(details: SavingsRateDetails): string {
  const savings = details.takeHome - details.spending;
  return `Saving $${savings.toLocaleString('en-US', { maximumFractionDigits: 0 })} of $${details.takeHome.toLocaleString('en-US', { maximumFractionDigits: 0 })} take-home pay (${details.previousRate.toFixed(1)}% last year)`;
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
      FROM (
        SELECT dates, total * conversion AS total_usd FROM us_spend
        UNION ALL
        SELECT dates, total * conversion AS total_usd FROM uk_spend
      )
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
