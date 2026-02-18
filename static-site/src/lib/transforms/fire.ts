/**
 * FIRE (Financial Independence, Retire Early) calculations.
 * Mirrors Python transforms/fire.py
 */

import Decimal from 'decimal.js';
import { getCurrentNetworth, getCombinedNetworth } from './networth';
import { getProjectedAnnualSpend, getPreviousYearSpending } from './spending';
import type {
  FireProjection,
  SwrSensitivityRow,
  FireProjectionSeries,
  ProjectionPoint,
  RetirementDrawdownRow,
  AccountType,
} from '$lib/data/types';
import { query } from '$lib/data/database';

/**
 * Get the best estimate of annual spending.
 * Uses projected annual spend if available, falls back to previous year.
 */
async function getAnnualSpendEstimate(): Promise<Decimal> {
  const projected = await getProjectedAnnualSpend();
  if (projected.isZero()) {
    return getPreviousYearSpending();
  }
  return projected;
}

/**
 * Calculate FIRE number based on estimated annual spending and withdrawal rate.
 * FIRE number = annual_spend_estimate / withdrawal_rate
 *
 * @param withdrawalRate Safe withdrawal rate as decimal (e.g., 0.04 for 4%)
 * @returns FIRE number in USD
 */
export async function getFireNumber(
  withdrawalRate: Decimal = new Decimal('0.04')
): Promise<Decimal> {
  if (withdrawalRate.isZero()) {
    return new Decimal(0);
  }
  const annualSpend = await getAnnualSpendEstimate();
  return annualSpend.div(withdrawalRate);
}

/**
 * Calculate percentage progress toward FIRE goal.
 *
 * @param fireGoal Target FIRE number in USD
 * @returns Progress percentage (e.g., 42.5 for 42.5%)
 */
export async function getFireProgressPct(fireGoal: Decimal): Promise<Decimal> {
  if (fireGoal.isZero()) {
    return new Decimal(0);
  }
  const currentNw = await getCurrentNetworth();
  return currentNw.div(fireGoal).mul(100);
}

/**
 * Calculate how many years current net worth would last at estimated annual spending.
 *
 * @returns Years of runway (999 if spending is 0)
 */
export async function getCurrentRunwayYears(): Promise<Decimal> {
  const currentNw = await getCurrentNetworth();
  const annualSpend = await getAnnualSpendEstimate();

  if (annualSpend.isZero()) {
    return new Decimal(999); // Effectively infinite runway
  }

  return currentNw.div(annualSpend);
}

/**
 * Calculate the median of an array of numbers.
 */
function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Brent's method for finding the minimum of a unimodal function.
 *
 * Combines golden section search, parabolic interpolation, and bisection
 * for superlinear convergence. Matches scipy.optimize.minimize_scalar behavior.
 *
 * @param f Function to minimize
 * @param a Lower bound
 * @param b Upper bound
 * @param tol Tolerance for convergence
 * @param maxIter Maximum iterations
 * @returns x value that minimizes f
 */
function brentMinimize(
  f: (x: number) => number,
  a: number,
  b: number,
  tol: number = 1e-8,
  maxIter: number = 500
): number {
  const golden = 0.3819660112501051; // (3 - sqrt(5)) / 2

  let x = a + golden * (b - a);
  let w = x;
  let v = x;
  let fx = f(x);
  let fw = fx;
  let fv = fx;

  let d = 0;
  let e = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    const midpoint = 0.5 * (a + b);
    const tol1 = tol * Math.abs(x) + 1e-10;
    const tol2 = 2 * tol1;

    // Check for convergence
    if (Math.abs(x - midpoint) <= tol2 - 0.5 * (b - a)) {
      return x;
    }

    let useParabolic = false;
    let p = 0;
    let q = 0;
    let r = 0;

    // Try parabolic interpolation
    if (Math.abs(e) > tol1) {
      r = (x - w) * (fx - fv);
      q = (x - v) * (fx - fw);
      p = (x - v) * q - (x - w) * r;
      q = 2 * (q - r);

      if (q > 0) {
        p = -p;
      } else {
        q = -q;
      }

      r = e;
      e = d;

      // Check if parabolic step is acceptable
      if (Math.abs(p) < Math.abs(0.5 * q * r) && p > q * (a - x) && p < q * (b - x)) {
        d = p / q;
        const u = x + d;

        // f must not be evaluated too close to a or b
        if (u - a < tol2 || b - u < tol2) {
          d = x < midpoint ? tol1 : -tol1;
        }
        useParabolic = true;
      }
    }

    // Use golden section if parabolic failed
    if (!useParabolic) {
      e = (x < midpoint ? b : a) - x;
      d = golden * e;
    }

    // f must not be evaluated too close to x
    const u = Math.abs(d) >= tol1 ? x + d : x + (d > 0 ? tol1 : -tol1);
    const fu = f(u);

    // Update bounds
    if (fu <= fx) {
      if (u < x) {
        b = x;
      } else {
        a = x;
      }
      v = w;
      w = x;
      x = u;
      fv = fw;
      fw = fx;
      fx = fu;
    } else {
      if (u < x) {
        a = u;
      } else {
        b = u;
      }
      if (fu <= fw || w === x) {
        v = w;
        w = u;
        fv = fw;
        fw = fu;
      } else if (fu <= fv || v === x || v === w) {
        v = u;
        fv = fu;
      }
    }
  }

  return x;
}

/**
 * Fit a line using Least Absolute Deviation (LAD) regression.
 *
 * LAD minimizes sum of absolute residuals, making it more robust to outliers
 * than ordinary least squares which minimizes squared residuals.
 *
 * Uses Brent's method to find the optimal slope (matches scipy.optimize.minimize_scalar).
 *
 * @param xValues Independent variable (time in years)
 * @param yValues Dependent variable (net worth)
 * @returns Tuple of [slope, intercept]
 */
function fitLAD(xValues: number[], yValues: number[]): [number, number] {
  const n = xValues.length;
  if (n < 2) {
    return [0, 0];
  }

  // Objective function: sum of absolute residuals for a given slope
  function objective(slope: number): number {
    // For a given slope, optimal intercept is median of (y - slope*x)
    const residuals = yValues.map((y, i) => y - slope * xValues[i]);
    const intercept = median(residuals);
    // Calculate sum of absolute residuals
    return yValues.reduce(
      (sum, y, i) => sum + Math.abs(y - (slope * xValues[i] + intercept)),
      0
    );
  }

  // Estimate initial bounds using OLS slope
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
  const numerator = xValues.reduce(
    (sum, x, i) => sum + (x - xMean) * (yValues[i] - yMean),
    0
  );
  const denominator = xValues.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  const olsSlope = denominator !== 0 ? numerator / denominator : 0;

  // Search bounds around OLS estimate (matches Python implementation)
  const lowerBound = olsSlope - Math.abs(olsSlope) * 2;
  const upperBound = olsSlope + Math.abs(olsSlope) * 2;

  // Use Brent's method to find optimal slope
  const optimalSlope = brentMinimize(objective, lowerBound, upperBound);

  // Calculate optimal intercept for the optimal slope
  const residuals = yValues.map((y, i) => y - optimalSlope * xValues[i]);
  const optimalIntercept = median(residuals);

  return [optimalSlope, optimalIntercept];
}

/**
 * Calculate average annual net worth growth over lookback period.
 *
 * Uses Least Absolute Deviation (LAD) regression on all data points in the
 * lookback period. LAD is more robust to outliers than ordinary least squares,
 * making it suitable for financial data with market volatility.
 *
 * @param lookbackYears Number of years to look back (default 3)
 * @returns Average annual growth in USD (slope of LAD regression line)
 */
export async function getAnnualNwGrowth(
  lookbackYears: number = 3
): Promise<Decimal> {
  const combined = await getCombinedNetworth();
  if (combined.length === 0) {
    return new Decimal(0);
  }

  const mostRecentDate = combined[combined.length - 1].dates;
  const cutoffDate = new Date(mostRecentDate);
  cutoffDate.setFullYear(cutoffDate.getFullYear() - lookbackYears);

  // Filter to lookback period
  const periodData = combined.filter((row) => row.dates >= cutoffDate);
  if (periodData.length < 2) {
    return new Decimal(0);
  }

  const startDate = periodData[0].dates;

  // Convert dates to years since start
  const xValues: number[] = [];
  const yValues: number[] = [];

  for (const row of periodData) {
    const daysElapsed =
      (row.dates.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const yearsElapsed = daysElapsed / 365.25;
    xValues.push(yearsElapsed);
    yValues.push(row.totalUsd);
  }

  // Fit LAD regression
  const [slope] = fitLAD(xValues, yValues);

  // Slope is in units of USD per year
  return new Decimal(slope);
}

/**
 * Project when FIRE will be achieved based on historical growth.
 *
 * @param fireGoal Target FIRE number in USD
 * @param lookbackYears Years of history to use for growth calculation
 * @returns FireProjection with date, years to FIRE, and annual growth
 */
export async function getProjectedFireDate(
  fireGoal: Decimal,
  lookbackYears: number = 3
): Promise<FireProjection> {
  const currentNw = await getCurrentNetworth();
  const annualGrowth = await getAnnualNwGrowth(lookbackYears);

  // Already at FIRE
  if (currentNw.greaterThanOrEqualTo(fireGoal)) {
    return {
      fireDate: null,
      yearsToFire: 0,
      annualNwGrowth: annualGrowth.toNumber(),
    };
  }

  // No growth or negative growth - can't project
  if (annualGrowth.lessThanOrEqualTo(0)) {
    return {
      fireDate: null,
      yearsToFire: null,
      annualNwGrowth: annualGrowth.toNumber(),
    };
  }

  // Calculate years to FIRE
  const gap = fireGoal.minus(currentNw);
  const yearsToFire = gap.div(annualGrowth);

  // Get most recent date and add years
  const combined = await getCombinedNetworth();
  if (combined.length === 0) {
    return {
      fireDate: null,
      yearsToFire: yearsToFire.toNumber(),
      annualNwGrowth: annualGrowth.toNumber(),
    };
  }

  const mostRecentDate = combined[combined.length - 1].dates;

  // Calculate projected date
  const daysToAdd = Math.round(yearsToFire.toNumber() * 365.25);
  const fireDate = new Date(mostRecentDate);
  fireDate.setDate(fireDate.getDate() + daysToAdd);

  return {
    fireDate,
    yearsToFire: yearsToFire.toNumber(),
    annualNwGrowth: annualGrowth.toNumber(),
  };
}

/**
 * Calculate FIRE dates for different safe withdrawal rates.
 *
 * Shows how the projected FIRE date changes at different SWR percentages.
 * Lower SWR = larger required nest egg = later FIRE date (more conservative).
 *
 * @param withdrawalRates Array of withdrawal rates as decimals (e.g., [0.03, 0.035, 0.04, 0.045])
 * @param lookbackYears Years of history to use for growth calculation
 * @param baseFireGoal Base FIRE goal to scale from (if null, calculates from spending)
 * @param baseSwr The SWR that corresponds to baseFireGoal (default 4%)
 * @returns Array of SwrSensitivityRow
 */
export async function getSwrSensitivity(
  withdrawalRates: number[] = [0.03, 0.035, 0.04, 0.045],
  lookbackYears: number = 3,
  baseFireGoal: Decimal | null = null,
  baseSwr: Decimal = new Decimal('0.04')
): Promise<SwrSensitivityRow[]> {
  // Calculate base FIRE goal if not provided
  let effectiveBaseGoal = baseFireGoal;
  if (effectiveBaseGoal === null) {
    effectiveBaseGoal = await getFireNumber(baseSwr);
  }

  const results: SwrSensitivityRow[] = [];

  for (const wr of withdrawalRates) {
    // Scale the FIRE goal: lower SWR = higher goal
    // FIRE_goal = base_goal * (base_swr / wr)
    const wrDecimal = new Decimal(wr);
    const fireGoal = effectiveBaseGoal.mul(baseSwr).div(wrDecimal);

    const projection = await getProjectedFireDate(fireGoal, lookbackYears);

    results.push({
      swr: `${(wr * 100).toFixed(1)}%`,
      fireDate: projection.fireDate,
      yearsToFire: projection.yearsToFire,
    });
  }

  return results;
}

/**
 * Format a FIRE projection as human-readable text.
 */
export function formatFireProjection(projection: FireProjection): string {
  if (projection.yearsToFire === 0) {
    return 'Already at FIRE goal!';
  }

  if (projection.yearsToFire === null) {
    return 'Cannot project (no positive growth trend)';
  }

  if (projection.fireDate === null) {
    return `${projection.yearsToFire.toFixed(1)} years to FIRE`;
  }

  const dateStr = projection.fireDate.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return `${dateStr} (${projection.yearsToFire.toFixed(1)} years)`;
}

/**
 * Get historical and projected net worth series for charting.
 *
 * Returns historical net worth data and a projected future trajectory based on
 * LAD regression slope. Used to render net worth chart with projection line.
 *
 * @param fireGoal Target FIRE number in USD
 * @param lookbackYears Years of history for growth calculation (default 3)
 * @param projectionYears Years to project into future (default 2)
 * @returns FireProjectionSeries with historical data, projection data, and fire goal
 */
export async function getFireProjectionSeries(
  fireGoal: Decimal,
  lookbackYears: number = 3,
  projectionYears: number = 2
): Promise<FireProjectionSeries> {
  const combined = await getCombinedNetworth();
  const annualGrowth = await getAnnualNwGrowth(lookbackYears);

  // Convert combined networth to ProjectionPoint format
  const historical: ProjectionPoint[] = combined.map((row) => ({
    dates: row.dates,
    totalUsd: row.totalUsd,
  }));

  if (combined.length === 0) {
    return {
      historical: [],
      projection: [],
      fireGoal: fireGoal.toNumber(),
    };
  }

  // Get current values for projection starting point
  const mostRecentDate = combined[combined.length - 1].dates;
  const currentNw = combined[combined.length - 1].totalUsd;

  // Create projection points (monthly for smooth line)
  const monthsToProject = projectionYears * 12;
  const projection: ProjectionPoint[] = [];

  for (let month = 1; month <= monthsToProject; month++) {
    // Add approximately 30 days per month
    const projDate = new Date(mostRecentDate);
    projDate.setDate(projDate.getDate() + month * 30);

    const yearsElapsed = month / 12;
    const projValue = currentNw + annualGrowth.toNumber() * yearsElapsed;

    projection.push({
      dates: projDate,
      totalUsd: projValue,
    });
  }

  return {
    historical,
    projection,
    fireGoal: fireGoal.toNumber(),
  };
}

// ============================================================================
// Retirement Drawdown Simulation
// ============================================================================

/** Tax-optimized withdrawal order: deplete taxable/low-growth first, preserve tax-free longest */
export const WITHDRAWAL_ORDER: AccountType[] = [
  'UK Cash',
  'HYSA',
  'Coinbase',
  'Taxable Brokerage',
  'UK Pension',
  '401k',
  'IRA',
  'HSA',
  'Roth IRA',
];

/** Accounts that grow at the investment growth rate */
const GROWTH_ACCOUNTS = new Set<AccountType>([
  'Taxable Brokerage',
  '401k',
  'IRA',
  'HSA',
  'Roth IRA',
  'UK Pension',
]);

/** Age at which each account type becomes accessible without penalty */
const ACCOUNT_ACCESS_AGES: Record<AccountType, number> = {
  'UK Cash': 0,
  'HYSA': 0,
  'Coinbase': 0,
  'Taxable Brokerage': 0,
  'UK Pension': 55,
  '401k': 60,
  'IRA': 60,
  'HSA': 65,
  'Roth IRA': 60,
};

/**
 * Calculate portfolio balance and withdrawals over retirement by account type.
 *
 * Uses tax-optimized withdrawal strategy: deplete accounts in priority order,
 * respecting account access ages. Investment accounts grow at the specified rate.
 * Withdrawals increase annually by inflation rate.
 *
 * @param fireGoal Target FIRE number (starting balance at retirement)
 * @param baseAnnualSpend Annual spending in year 1. If undefined, uses projected spend.
 * @param growthRate Annual investment growth rate (default 5%)
 * @param inflationRate Annual inflation rate (default 2%)
 * @param retirementAge Age at retirement (default 50)
 * @param endAge Age to project to (default 95)
 * @returns Array of per-year simulation data
 */
export async function getRetirementDrawdownSeries(
  fireGoal: Decimal,
  baseAnnualSpend?: Decimal,
  growthRate: Decimal = new Decimal('0.05'),
  inflationRate: Decimal = new Decimal('0.02'),
  retirementAge: number = 50,
  endAge: number = 95
): Promise<RetirementDrawdownRow[]> {
  // Query US asset allocation grouped by account type
  const usBalances = await query<{ account_type: string; total: number }>(`
    SELECT account_type, SUM(value) as total
    FROM us_asset_allocation
    GROUP BY account_type
  `);

  // Query UK asset allocation grouped by account type (converted to USD)
  const ukBalances = await query<{ account_type: string; total: number }>(`
    SELECT account_type, SUM(value * conversion) as total
    FROM uk_asset_allocation
    GROUP BY account_type
  `);

  // Initialize all account balances to zero
  const accountBalances: Record<AccountType, Decimal> = {} as Record<AccountType, Decimal>;
  for (const acct of WITHDRAWAL_ORDER) {
    accountBalances[acct] = new Decimal(0);
  }

  // Add US balances
  for (const row of usBalances) {
    const acctType = row.account_type as AccountType;
    if (WITHDRAWAL_ORDER.includes(acctType) && row.total != null && !isNaN(row.total)) {
      accountBalances[acctType] = new Decimal(row.total);
    }
  }

  // Add UK balances
  for (const row of ukBalances) {
    const acctType = row.account_type as AccountType;
    if (WITHDRAWAL_ORDER.includes(acctType) && row.total != null && !isNaN(row.total)) {
      accountBalances[acctType] = accountBalances[acctType].plus(row.total);
    }
  }

  // Scale balances to match FIRE goal
  const currentTotal = WITHDRAWAL_ORDER.reduce(
    (sum, acct) => sum.plus(accountBalances[acct]),
    new Decimal(0)
  );

  if (currentTotal.greaterThan(0)) {
    const scaleFactor = fireGoal.div(currentTotal);
    for (const acct of WITHDRAWAL_ORDER) {
      accountBalances[acct] = accountBalances[acct].mul(scaleFactor);
    }
  }

  // Get base withdrawal amount
  const baseWithdrawal = baseAnnualSpend ?? (await getProjectedAnnualSpend());
  const growthMultiplier = new Decimal(1).plus(growthRate);
  const inflationMultiplier = new Decimal(1).plus(inflationRate);

  // Build year-by-year projection
  const rows: RetirementDrawdownRow[] = [];

  for (let yearNum = 1; yearNum <= endAge - retirementAge + 1; yearNum++) {
    const age = retirementAge + yearNum - 1;

    // Apply growth to investment accounts (after first year)
    if (yearNum > 1) {
      for (const acct of WITHDRAWAL_ORDER) {
        if (GROWTH_ACCOUNTS.has(acct)) {
          accountBalances[acct] = accountBalances[acct].mul(growthMultiplier);
        }
      }
    }

    // Record start-of-year balances
    const balances: Record<AccountType, number> = {} as Record<AccountType, number>;
    let totalBalance = new Decimal(0);
    for (const acct of WITHDRAWAL_ORDER) {
      balances[acct] = accountBalances[acct].toNumber();
      totalBalance = totalBalance.plus(accountBalances[acct]);
    }

    // Calculate withdrawal for this year (increases with inflation)
    const annualWithdrawal = baseWithdrawal.mul(inflationMultiplier.pow(yearNum - 1));
    let remainingToWithdraw = Decimal.min(annualWithdrawal, totalBalance);
    const withdrawalAmount = remainingToWithdraw.toNumber();

    // Track per-account withdrawals
    const withdrawalsByAccount: Record<AccountType, number> = {} as Record<AccountType, number>;
    for (const acct of WITHDRAWAL_ORDER) {
      withdrawalsByAccount[acct] = 0;
    }

    // Deplete accounts in priority order, respecting access ages
    for (const acct of WITHDRAWAL_ORDER) {
      if (remainingToWithdraw.lessThanOrEqualTo(0)) break;

      const accessAge = ACCOUNT_ACCESS_AGES[acct];
      if (age < accessAge) continue;

      const available = accountBalances[acct];
      const withdrawFromThis = Decimal.min(available, remainingToWithdraw);

      accountBalances[acct] = available.minus(withdrawFromThis);
      withdrawalsByAccount[acct] = withdrawFromThis.toNumber();
      remainingToWithdraw = remainingToWithdraw.minus(withdrawFromThis);
    }

    rows.push({
      age,
      year: yearNum,
      balances,
      totalBalance: totalBalance.toNumber(),
      withdrawal: withdrawalAmount,
      withdrawalsByAccount,
    });
  }

  return rows;
}
