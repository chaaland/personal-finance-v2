/**
 * Pure engine for the savings-plus-return FIRE projection.
 * No imports other than types, so it can be unit-tested with `npm test` and run anywhere.
 * Plain floats are used on purpose: the simulation draws thousands of paths and Decimal
 * would add cost without benefit. Callers convert at the boundaries.
 */

/**
 * Annual savings estimate from chronological monthly savings (most recent last).
 * The trailing 12-month total: stable regardless of when bonuses land. With less than a
 * year of history, the mean of what exists scaled to 12 months; 0 with none.
 */
export function estimateAnnualSavings(monthlySavings: number[]): number {
  if (monthlySavings.length === 0) return 0;
  const window = monthlySavings.slice(-12);
  const total = window.reduce((sum, s) => sum + s, 0);
  return window.length === 12 ? total : (total / window.length) * 12;
}

/** 'YYYY-MM' of the month before the given one. */
function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' of the month after the given one. */
function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Monthly savings (take-home minus spending) for every month from the first to the last
 * paycheck. A month with no paycheck counts as zero take-home, like the savings-rate card.
 * Inputs and outputs are keyed by 'YYYY-MM'.
 */
export function savingsByMonth(
  takeHome: Record<string, number>,
  spend: Record<string, number>
): { months: string[]; byMonth: Record<string, number> } {
  const paid = Object.keys(takeHome).sort();
  if (paid.length === 0) return { months: [], byMonth: {} };
  const months: string[] = [];
  const byMonth: Record<string, number> = {};
  for (let month = paid[0]; month <= paid[paid.length - 1]; month = nextMonth(month)) {
    months.push(month);
    byMonth[month] = (takeHome[month] ?? 0) - (spend[month] ?? 0);
  }
  return { months, byMonth };
}

/** Net worth keyed by 'YYYY-MM', using the latest observation in each month. */
export function monthEndNetWorth(observations: { date: Date; value: number }[]): Record<string, number> {
  const latest: Record<string, { time: number; value: number }> = {};
  for (const { date, value } of observations) {
    const month = date.toISOString().slice(0, 7);
    const time = date.getTime();
    if (latest[month] === undefined || time >= latest[month].time) latest[month] = { time, value };
  }
  return Object.fromEntries(Object.entries(latest).map(([month, { value }]) => [month, value]));
}

/** Add calendar months in UTC, clamping to the end of a shorter month (31 Jan + 1 month = 28 Feb). */
export function addMonths(date: Date, months: number): Date {
  const lastDayOfTarget = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months + 1, 0));
  return new Date(
    Date.UTC(lastDayOfTarget.getUTCFullYear(), lastDayOfTarget.getUTCMonth(), Math.min(date.getUTCDate(), lastDayOfTarget.getUTCDate()))
  );
}

/**
 * Implied monthly investment returns, backing savings out of net worth:
 *   r = (NW[t] - NW[t-1] - s[t]) / (NW[t-1] + s[t]/2)
 * (savings are assumed to arrive mid-month). Months are 'YYYY-MM' keys. Only months strictly
 * after `afterMonth` are used, and months missing net worth (this or last month) or savings
 * are skipped. Returned chronologically.
 */
export function impliedMonthlyReturns(
  netWorth: Record<string, number>,
  savings: Record<string, number>,
  afterMonth?: string
): number[] {
  const returns: number[] = [];
  for (const month of Object.keys(savings).sort()) {
    if (afterMonth !== undefined && month <= afterMonth) continue;
    const now = netWorth[month];
    const before = netWorth[previousMonth(month)];
    if (now === undefined || before === undefined) continue;
    returns.push((now - before - savings[month]) / (before + savings[month] / 2));
  }
  return returns;
}

export const DEFAULT_VOLATILITY = 0.15;
const MIN_MONTHS_FOR_VOLATILITY = 36;

/**
 * Annualized volatility from implied monthly returns: sample standard deviation x sqrt(12),
 * clamped to 5%-30%. With fewer than 36 months the 15% default is used instead.
 */
export function estimateVolatility(monthlyReturns: number[]): { value: number; source: 'data' | 'default' } {
  const n = monthlyReturns.length;
  if (n < MIN_MONTHS_FOR_VOLATILITY) return { value: DEFAULT_VOLATILITY, source: 'default' };
  const mean = monthlyReturns.reduce((a, b) => a + b, 0) / n;
  const variance = monthlyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  return { value: Math.min(0.3, Math.max(0.05, Math.sqrt(variance * 12))), source: 'data' };
}

// ---------------------------------------------------------------------------
// Monte Carlo simulation
// ---------------------------------------------------------------------------

export interface SimulationParams {
  startNetWorth: number;
  /** Savings per year, held flat in today's dollars. */
  annualSavings: number;
  /** Expected annual return after inflation (arithmetic mean). */
  expectedRealReturn: number;
  /** Annualized volatility of returns. 0 gives the deterministic path. */
  volatility: number;
  /** Net worth targets; hit statistics are returned for each, from the same random paths. */
  goals: number[];
  horizonMonths?: number;
  paths?: number;
  seed?: number;
}

/** Months until a goal is reached. A quantile is null when fewer than that share of paths get there. */
export interface HitStats {
  alreadyThere: boolean;
  /** 10th percentile: only 10% of paths get there sooner. */
  early: number | null;
  median: number | null;
  /** 90th percentile: 90% of paths have got there by then. */
  late: number | null;
  /** Share of paths that reach the goal within the horizon. */
  probability: number;
}

export interface Bands {
  /** Net worth percentiles by month; index 0 is the starting net worth. */
  p10: number[];
  p50: number[];
  p90: number[];
}

export interface SimulationResult {
  hits: HitStats[];
  bands: (months: number) => Bands;
}

const DEFAULT_PATHS = 5000;
const DEFAULT_HORIZON_MONTHS = 360;
const DEFAULT_SEED = 20261101;

/** Small seeded PRNG so results are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draws (Box-Muller) from a uniform generator. */
function normalGenerator(uniform: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const z = spare;
      spare = null;
      return z;
    }
    const u = 1 - uniform(); // (0, 1]
    const v = uniform();
    const radius = Math.sqrt(-2 * Math.log(u));
    spare = radius * Math.sin(2 * Math.PI * v);
    return radius * Math.cos(2 * Math.PI * v);
  };
}

/** Smallest value that at least a share q of the sorted values are <= (q in (0, 1]). */
function quantileOf(sortedAscending: Float64Array, q: number): number {
  return sortedAscending[Math.max(0, Math.ceil(q * sortedAscending.length) - 1)];
}

/**
 * Simulate net worth monthly in today's dollars:
 *   NW[t+1] = NW[t] * (1 + R) + c,   ln(1 + R) ~ Normal(ln(1 + mu_m) - sigma_m^2 / 2, sigma_m^2)
 * so that E[1 + R] = 1 + mu_m. Random draws do not depend on the return, goal, or savings, so
 * changing a setting moves the result smoothly rather than re-rolling the dice.
 */
export function simulate(params: SimulationParams): SimulationResult {
  const horizon = params.horizonMonths ?? DEFAULT_HORIZON_MONTHS;
  const paths = params.paths ?? DEFAULT_PATHS;
  const { startNetWorth, goals } = params;
  const saving = params.annualSavings / 12;
  const monthlyReturn = Math.pow(1 + params.expectedRealReturn, 1 / 12) - 1;
  const monthlySigma = params.volatility / Math.sqrt(12);
  const logDrift = Math.log(1 + monthlyReturn) - (monthlySigma * monthlySigma) / 2;
  const normal = normalGenerator(mulberry32(params.seed ?? DEFAULT_SEED));

  const width = horizon + 1;
  const netWorth = new Float64Array(paths * width);
  const hitMonth = goals.map((goal) => new Float64Array(paths).fill(startNetWorth >= goal ? 0 : Infinity));

  for (let p = 0; p < paths; p++) {
    const row = p * width;
    let value = startNetWorth;
    netWorth[row] = value;
    for (let m = 1; m <= horizon; m++) {
      value = value * Math.exp(logDrift + monthlySigma * normal()) + saving;
      netWorth[row + m] = value;
      for (let g = 0; g < goals.length; g++) {
        if (hitMonth[g][p] === Infinity && value >= goals[g]) hitMonth[g][p] = m;
      }
    }
  }

  const hits = goals.map((goal, g): HitStats => {
    const sorted = hitMonth[g].slice().sort();
    const at = (q: number) => {
      const months = quantileOf(sorted, q);
      return Number.isFinite(months) ? months : null;
    };
    const reached = sorted.reduce((n, months) => n + (Number.isFinite(months) ? 1 : 0), 0);
    return { alreadyThere: startNetWorth >= goal, early: at(0.1), median: at(0.5), late: at(0.9), probability: reached / paths };
  });

  const bands = (months: number): Bands => {
    const last = Math.min(months, horizon);
    const result: Bands = { p10: [], p50: [], p90: [] };
    const column = new Float64Array(paths);
    for (let m = 0; m <= last; m++) {
      for (let p = 0; p < paths; p++) column[p] = netWorth[p * width + m];
      column.sort();
      result.p10.push(quantileOf(column, 0.1));
      result.p50.push(quantileOf(column, 0.5));
      result.p90.push(quantileOf(column, 0.9));
    }
    return result;
  };

  return { hits, bands };
}

const MIN_CHART_MONTHS = 60;
const MAX_CHART_MONTHS = 180;
const DEFAULT_CHART_MONTHS = 120;

/**
 * How many months of projection to draw: a quarter beyond the median months to FIRE, but at
 * least 5 years (so the range has room to fan out) and at most 15. 10 years when there is no median.
 */
export function chartHorizonMonths(medianMonths: number | null): number {
  if (medianMonths === null) return DEFAULT_CHART_MONTHS;
  return Math.min(MAX_CHART_MONTHS, Math.max(MIN_CHART_MONTHS, Math.round(medianMonths * 1.25)));
}
