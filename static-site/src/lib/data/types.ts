/**
 * TypeScript interfaces for finance data.
 * Mirrors Python data/loader.py FinanceData dataclass.
 */

export interface SpendRow {
  dates: Date;
  total: number;
  conversion: number;
}

export interface NetworthRow {
  dates: Date;
  net: number;
  conversion: number;
}

export interface CompRow {
  dates: Date;
  gross: number;
  pensionContrib: number;
  net: number;
  conversion: number;
}

export interface AssetRow {
  asset: string;
  value: number;
  accountType: string;
  conversion?: number; // UK only
}

/**
 * Container for all loaded finance data.
 * Mirrors Python FinanceData dataclass.
 */
export interface FinanceData {
  usSpend: SpendRow[];
  ukSpend: SpendRow[];
  usNetworth: NetworthRow[];
  ukNetworth: NetworthRow[];
  totalComp: CompRow[];
  usAssetAllocation: AssetRow[];
  ukAssetAllocation: AssetRow[];
}

// Transform result types

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

export interface FireProjection {
  fireDate: Date | null;
  yearsToFire: number | null;
  annualNwGrowth: number;
}

export interface SwrSensitivityRow {
  swr: string;
  fireDate: Date | null;
  yearsToFire: number | null;
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

export interface ProjectionPoint {
  dates: Date;
  totalUsd: number;
}

export interface FireProjectionSeries {
  historical: ProjectionPoint[];
  projection: ProjectionPoint[];
  fireGoal: number;
}
