/**
 * TypeScript interfaces for the results returned by the transform functions.
 */

export interface CombinedNetworth {
  dates: Date;
  usUsd: number;
  ukUsd: number;
  totalUsd: number;
}

export interface NetworthChangeDetails {
  startValue: number;
  startDate: string;
  endValue: number;
  endDate: string;
  change: number;
  changePct: number;
}

export interface IncomeDetails {
  ytdGross: number;
  ytdNet: number;
  previousYtdGross: number;
  change: number;
  changePct: number;
}

export interface SpendingDetails {
  projectedValue: number;
  currentYear: number;
  previousValue: number;
  previousYear: number;
  ytdSpend: number;
  monthsElapsed: number;
  change: number;
  changePct: number;
}

export interface SavingsRateDetails {
  savingsRate: number;
  takeHome: number;
  spending: number;
  previousRate: number;
  change: number;
}

/**
 * When FIRE is reached, from the Monte Carlo projection: the median date with a 10th-90th
 * percentile range. A date is null when too few simulated paths reach the goal within the
 * horizon (30 years).
 */
export interface FireDateEstimate {
  alreadyThere: boolean;
  /** Only 10% of simulated paths get there sooner. */
  earlyDate: Date | null;
  medianDate: Date | null;
  /** 90% of simulated paths have got there by then. */
  lateDate: Date | null;
  medianYears: number | null;
  /** Share of simulated paths that reach the goal within the horizon. */
  probability: number;
}

export interface SwrSensitivityRow {
  swr: string;
  estimate: FireDateEstimate;
}

/** What the projection assumed, shown to the user so nothing is hidden. */
export interface ProjectionAssumptions {
  startNetWorth: number;
  /** Savings per year in today's dollars: the trailing 12 months of take-home minus spending. */
  annualSavings: number;
  expectedRealReturn: number;
  volatility: number;
  volatilitySource: 'data' | 'default';
  goal: number;
}

/** Projected net worth percentiles by month (today's dollars); index 0 is today. */
export interface NetWorthBand {
  dates: Date[];
  p10: number[];
  p50: number[];
  p90: number[];
}

export interface FireProjection {
  assumptions: ProjectionAssumptions;
  estimate: FireDateEstimate;
  swr: SwrSensitivityRow[];
  band: NetWorthBand;
}

export interface YoyNetworthChange {
  year: number;
  startValue: number;
  endValue: number;
  change: number;
  changePct: number;
}

export interface IncomeByYear {
  year: number;
  grossUsd: number;
  netUsd: number;
}

// Spending tab types

export interface MonthlySpendingRow {
  dates: Date;
  totalUsd: number;
  medianUsd: number | null;
}

export interface SpendingByYear {
  year: number;
  totalUsd: number;
}

export interface SavingsRateByYear {
  year: number;
  savingsRate: number;
}

// FIRE Tab types

/** Account types in tax-optimized withdrawal order */
export type AccountType =
  | 'UK Cash'
  | 'HYSA'
  | 'Coinbase'
  | 'Taxable Brokerage'
  | 'UK Pension'
  | '401k'
  | 'IRA'
  | 'HSA'
  | 'Roth IRA';

/** Per-year retirement simulation data */
export interface RetirementDrawdownRow {
  age: number;
  year: number; // Retirement year (1-indexed)
  balances: Record<AccountType, number>;
  totalBalance: number;
  withdrawal: number;
  withdrawalsByAccount: Record<AccountType, number>;
}
