/**
 * Net worth calculations and transformations.
 * Mirrors Python transforms/networth.py
 */

import Decimal from 'decimal.js';
import { query } from '$lib/data/database';
import type { CombinedNetworth, NetworthChangeDetails, YoyNetworthChange } from '$lib/data/types';

interface NetworthRow {
  dates: Date;
  us_usd: number;
  uk_usd: number;
  total_usd: number;
}

/**
 * Get combined US and UK net worth with forward-fill interpolation.
 * Replaces Polars join_asof with SQL subqueries.
 */
export async function getCombinedNetworth(): Promise<CombinedNetworth[]> {
  const sql = `
    WITH all_dates AS (
      SELECT DISTINCT dates FROM us_networth
      UNION
      SELECT DISTINCT dates FROM uk_networth
    ),
    us_filled AS (
      SELECT
        a.dates,
        (SELECT u.net * u.conversion
         FROM us_networth u
         WHERE u.dates <= a.dates
         ORDER BY u.dates DESC
         LIMIT 1) AS us_usd
      FROM all_dates a
    ),
    uk_filled AS (
      SELECT
        a.dates,
        (SELECT k.net * k.conversion
         FROM uk_networth k
         WHERE k.dates <= a.dates
         ORDER BY k.dates DESC
         LIMIT 1) AS uk_usd
      FROM all_dates a
    )
    SELECT
      u.dates,
      COALESCE(u.us_usd, 0) AS us_usd,
      COALESCE(k.uk_usd, 0) AS uk_usd,
      COALESCE(u.us_usd, 0) + COALESCE(k.uk_usd, 0) AS total_usd
    FROM us_filled u
    JOIN uk_filled k ON u.dates = k.dates
    ORDER BY u.dates
  `;

  const rows = await query<NetworthRow>(sql);

  return rows.map((row) => ({
    dates: new Date(row.dates),
    usUsd: Number(row.us_usd),
    ukUsd: Number(row.uk_usd),
    totalUsd: Number(row.total_usd),
  }));
}

/**
 * Get the most recent total net worth in USD.
 */
export async function getCurrentNetworth(): Promise<Decimal> {
  const combined = await getCombinedNetworth();
  if (combined.length === 0) {
    return new Decimal(0);
  }
  return new Decimal(combined[combined.length - 1].totalUsd);
}

/**
 * Get year-to-date net worth change.
 * Returns [absolute_change, percentage_change]
 */
export async function getYtdNetworthChange(): Promise<[Decimal, Decimal]> {
  const combined = await getCombinedNetworth();
  if (combined.length === 0) {
    return [new Decimal(0), new Decimal(0)];
  }

  const mostRecentDate = combined[combined.length - 1].dates;
  const currentYear = mostRecentDate.getFullYear();
  const currentValue = new Decimal(combined[combined.length - 1].totalUsd);

  // Get data for current year
  const yearData = combined.filter((row) => row.dates.getFullYear() === currentYear);

  if (yearData.length === 0) {
    return [new Decimal(0), new Decimal(0)];
  }

  let startValue: Decimal;

  // If only one data point this year (January), compare against December of previous year
  if (yearData.length === 1) {
    const prevYearData = combined.filter((row) => row.dates.getFullYear() === currentYear - 1);
    if (prevYearData.length === 0) {
      return [new Decimal(0), new Decimal(0)];
    }
    startValue = new Decimal(prevYearData[prevYearData.length - 1].totalUsd);
  } else {
    startValue = new Decimal(yearData[0].totalUsd);
  }

  const absoluteChange = currentValue.minus(startValue);
  const percentageChange = startValue.isZero()
    ? new Decimal(0)
    : absoluteChange.div(startValue).mul(100);

  return [absoluteChange, percentageChange];
}

/**
 * Get detailed YTD net worth change info including dates.
 */
export async function getYtdNetworthDetails(): Promise<NetworthChangeDetails> {
  const combined = await getCombinedNetworth();

  if (combined.length === 0) {
    return {
      startValue: 0,
      startDate: 'N/A',
      endValue: 0,
      endDate: 'N/A',
      change: 0,
      changePct: 0,
    };
  }

  const mostRecentDate = combined[combined.length - 1].dates;
  const currentYear = mostRecentDate.getFullYear();
  const currentValue = combined[combined.length - 1].totalUsd;

  const yearData = combined.filter((row) => row.dates.getFullYear() === currentYear);

  let startValue: number;
  let startDate: Date;

  if (yearData.length <= 1) {
    // Compare against December of previous year
    const prevYearData = combined.filter((row) => row.dates.getFullYear() === currentYear - 1);
    if (prevYearData.length === 0) {
      return {
        startValue: 0,
        startDate: 'N/A',
        endValue: currentValue,
        endDate: formatDate(mostRecentDate),
        change: 0,
        changePct: 0,
      };
    }
    startValue = prevYearData[prevYearData.length - 1].totalUsd;
    startDate = prevYearData[prevYearData.length - 1].dates;
  } else {
    startValue = yearData[0].totalUsd;
    startDate = yearData[0].dates;
  }

  const change = currentValue - startValue;
  const changePct = startValue !== 0 ? (change / startValue) * 100 : 0;

  return {
    startValue,
    startDate: formatDate(startDate),
    endValue: currentValue,
    endDate: formatDate(mostRecentDate),
    change,
    changePct,
  };
}

/**
 * Format explanation text for net worth change.
 */
export function formatNetworthExplanation(details: NetworthChangeDetails): string {
  const direction = details.change >= 0 ? 'Increased' : 'Decreased';
  return `${direction} from $${details.startValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} on ${details.startDate} to $${details.endValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} on ${details.endDate}`;
}

/**
 * Format a date as "Mon DD, YYYY"
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get year-over-year net worth changes.
 * Returns array with year, start value, end value, change, and change percentage.
 */
export async function getYoyNetworthChanges(): Promise<YoyNetworthChange[]> {
  const combined = await getCombinedNetworth();

  if (combined.length === 0) {
    return [];
  }

  // Group data by year
  const yearlyData = new Map<number, { startValue: number; endValue: number }>();

  for (const row of combined) {
    const year = row.dates.getFullYear();

    if (!yearlyData.has(year)) {
      // First entry for this year becomes the start value
      yearlyData.set(year, { startValue: row.totalUsd, endValue: row.totalUsd });
    } else {
      // Update end value (data is sorted by date, so last seen is the end)
      yearlyData.get(year)!.endValue = row.totalUsd;
    }
  }

  // Convert to result array with calculations
  const results: YoyNetworthChange[] = [];

  for (const [year, data] of yearlyData) {
    const change = data.endValue - data.startValue;
    const changePct = data.startValue !== 0 ? (change / data.startValue) * 100 : 0;

    results.push({
      year,
      startValue: data.startValue,
      endValue: data.endValue,
      change,
      changePct,
    });
  }

  // Sort by year
  return results.sort((a, b) => a.year - b.year);
}

export interface AllocationItem {
  label: string;
  value: number;
}

/**
 * Get asset allocation grouped by asset (stock) for a specific region.
 * @param region One of "US", "UK", or "All"
 * @returns Array of { label, value } sorted by value descending
 */
export async function getAssetAllocationByStock(
  region: 'US' | 'UK' | 'All'
): Promise<AllocationItem[]> {
  let sql: string;

  if (region === 'US') {
    sql = `
      SELECT asset AS label, SUM(value) AS value
      FROM us_asset_allocation
      GROUP BY asset
      ORDER BY value DESC
    `;
  } else if (region === 'UK') {
    sql = `
      SELECT asset AS label, SUM(value * conversion) AS value
      FROM uk_asset_allocation
      GROUP BY asset
      ORDER BY value DESC
    `;
  } else {
    // All - combine US and UK
    sql = `
      SELECT label, SUM(value) AS value
      FROM (
        SELECT asset AS label, value FROM us_asset_allocation
        UNION ALL
        SELECT asset AS label, value * conversion AS value FROM uk_asset_allocation
      )
      GROUP BY label
      ORDER BY value DESC
    `;
  }

  interface RawRow {
    label: string;
    value: number;
  }

  const rows = await query<RawRow>(sql);
  return rows.map((row) => ({
    label: row.label,
    value: Number(row.value),
  }));
}

/**
 * Get asset allocation grouped by account type for a specific region.
 * @param region One of "US", "UK", or "All"
 * @returns Array of { label, value } sorted by value descending
 */
export async function getAssetAllocationByAccountType(
  region: 'US' | 'UK' | 'All'
): Promise<AllocationItem[]> {
  let sql: string;

  if (region === 'US') {
    sql = `
      SELECT account_type AS label, SUM(value) AS value
      FROM us_asset_allocation
      GROUP BY account_type
      ORDER BY value DESC
    `;
  } else if (region === 'UK') {
    sql = `
      SELECT account_type AS label, SUM(value * conversion) AS value
      FROM uk_asset_allocation
      GROUP BY account_type
      ORDER BY value DESC
    `;
  } else {
    // All - combine US and UK
    sql = `
      SELECT label, SUM(value) AS value
      FROM (
        SELECT account_type AS label, value FROM us_asset_allocation
        UNION ALL
        SELECT account_type AS label, value * conversion AS value FROM uk_asset_allocation
      )
      GROUP BY label
      ORDER BY value DESC
    `;
  }

  interface RawRow {
    label: string;
    value: number;
  }

  const rows = await query<RawRow>(sql);
  return rows.map((row) => ({
    label: row.label,
    value: Number(row.value),
  }));
}
