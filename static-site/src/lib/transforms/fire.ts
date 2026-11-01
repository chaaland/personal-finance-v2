/**
 * FIRE (Financial Independence, Retire Early) calculations.
 */

import Decimal from 'decimal.js';
import { getCurrentNetworth, getAssetAllocationByAccountType } from './networth';
import { getProjectedAnnualSpend, getPreviousYearSpending } from './spending';
import type { RetirementDrawdownRow, AccountType } from '$lib/data/types';

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
  // Current balance per account type (US + UK, in USD)
  const accountBalances = Object.fromEntries(
    WITHDRAWAL_ORDER.map((acct) => [acct, new Decimal(0)])
  ) as Record<AccountType, Decimal>;

  for (const { label, value } of await getAssetAllocationByAccountType('All')) {
    const acctType = label as AccountType;
    if (WITHDRAWAL_ORDER.includes(acctType) && !isNaN(value)) {
      accountBalances[acctType] = new Decimal(value);
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
