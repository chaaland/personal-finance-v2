/**
 * Net worth calculations and transformations.
 */

import Decimal from 'decimal.js';
import { query } from '$lib/data/database';
import { formatUsd } from '$lib/theme';
import type { CombinedNetworth, NetworthChangeDetails, YoyNetworthChange } from '$lib/data/types';

interface NetworthRow {
  dates: Date;
  us_usd: number;
  uk_usd: number;
  total_usd: number;
}

/**
 * Get combined US and UK net worth with forward-fill interpolation.
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
 * Find the points a year-to-date change is measured between: the latest
 * observation (end) and the first observation of its year (start). When the
 * latest year has only one observation, the last observation of the previous
 * year is used as the start instead. `start` is null when no baseline exists.
 */
function getYtdBounds(
  combined: CombinedNetworth[]
): { start: CombinedNetworth | null; end: CombinedNetworth } | null {
  if (combined.length === 0) {
    return null;
  }

  const end = combined[combined.length - 1];
  const currentYear = end.dates.getFullYear();
  const yearData = combined.filter((row) => row.dates.getFullYear() === currentYear);

  if (yearData.length > 1) {
    return { start: yearData[0], end };
  }

  const prevYearData = combined.filter((row) => row.dates.getFullYear() === currentYear - 1);
  return { start: prevYearData.length > 0 ? prevYearData[prevYearData.length - 1] : null, end };
}

/**
 * Get year-to-date net worth change.
 * Returns [absolute_change, percentage_change]
 */
export async function getYtdNetworthChange(): Promise<[Decimal, Decimal]> {
  const bounds = getYtdBounds(await getCombinedNetworth());
  if (!bounds?.start) {
    return [new Decimal(0), new Decimal(0)];
  }

  const startValue = new Decimal(bounds.start.totalUsd);
  const absoluteChange = new Decimal(bounds.end.totalUsd).minus(startValue);
  const percentageChange = startValue.isZero()
    ? new Decimal(0)
    : absoluteChange.div(startValue).mul(100);

  return [absoluteChange, percentageChange];
}

/**
 * Get detailed YTD net worth change info including dates.
 */
export async function getYtdNetworthDetails(): Promise<NetworthChangeDetails> {
  const bounds = getYtdBounds(await getCombinedNetworth());

  if (!bounds) {
    return { startValue: 0, startDate: 'N/A', endValue: 0, endDate: 'N/A', change: 0, changePct: 0 };
  }

  const { start, end } = bounds;
  const endDate = formatDate(end.dates);
  if (!start) {
    return { startValue: 0, startDate: 'N/A', endValue: end.totalUsd, endDate, change: 0, changePct: 0 };
  }

  const change = end.totalUsd - start.totalUsd;
  return {
    startValue: start.totalUsd,
    startDate: formatDate(start.dates),
    endValue: end.totalUsd,
    endDate,
    change,
    changePct: start.totalUsd !== 0 ? (change / start.totalUsd) * 100 : 0,
  };
}

/**
 * Format explanation text for net worth change.
 */
export function formatNetworthExplanation(details: NetworthChangeDetails): string {
  const direction = details.change >= 0 ? 'Increased' : 'Decreased';
  return `${direction} from ${formatUsd(details.startValue)} on ${details.startDate} to ${formatUsd(details.endValue)} on ${details.endDate}`;
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

type Region = 'US' | 'UK' | 'All';

/**
 * Sum asset allocation by the given column for a region, in USD.
 * UK holdings are converted with their stored GBP/USD rate.
 * @returns Array of { label, value } sorted by value descending
 */
async function getAssetAllocation(
  column: 'asset' | 'account_type',
  region: Region
): Promise<AllocationItem[]> {
  const us = `SELECT ${column} AS label, value FROM us_asset_allocation`;
  const uk = `SELECT ${column} AS label, value * conversion AS value FROM uk_asset_allocation`;
  const source = region === 'US' ? us : region === 'UK' ? uk : `${us} UNION ALL ${uk}`;

  const rows = await query<{ label: string; value: number }>(`
    SELECT label, SUM(value) AS value
    FROM (${source})
    GROUP BY label
    ORDER BY value DESC
  `);
  return rows.map((row) => ({ label: row.label, value: Number(row.value) }));
}

/**
 * Get asset allocation grouped by asset (stock) for a specific region.
 */
export function getAssetAllocationByStock(region: Region): Promise<AllocationItem[]> {
  return getAssetAllocation('asset', region);
}

/**
 * Get asset allocation grouped by account type for a specific region.
 */
export function getAssetAllocationByAccountType(region: Region): Promise<AllocationItem[]> {
  return getAssetAllocation('account_type', region);
}
