import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estimateAnnualSavings, impliedMonthlyReturns, estimateVolatility, simulate, savingsByMonth, monthEndNetWorth, addMonths } from './projection-engine.ts';

describe('estimateAnnualSavings', () => {
  it('is the total of the last 12 months', () => {
    // 24 months: first year saves 100/month, second year saves 200/month
    const savings = [...Array(12).fill(100), ...Array(12).fill(200)];
    assert.equal(estimateAnnualSavings(savings), 2400);
  });

  it('counts bonus months wherever they fall in the window and ignores older months', () => {
    const lastYear = [500, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 500]; // two bonuses, ten ordinary months
    assert.equal(estimateAnnualSavings([9999, ...lastYear]), 1500);
  });

  it('scales the mean up to a year when there are fewer than 12 months', () => {
    assert.equal(estimateAnnualSavings([100, 200, 300]), 200 * 12);
  });

  it('is 0 with no history', () => {
    assert.equal(estimateAnnualSavings([]), 0);
  });
});

/** Build net worth from known returns and savings using the identity the estimator inverts. */
function buildSeries(start: string, startNw: number, returns: number[], savings: number[]) {
  const months: string[] = [];
  let [y, m] = start.split('-').map(Number);
  for (let i = 0; i <= returns.length; i++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  const nw: Record<string, number> = { [months[0]]: startNw };
  const sav: Record<string, number> = {};
  for (let i = 1; i < months.length; i++) {
    const prev = nw[months[i - 1]];
    const s = savings[i - 1];
    sav[months[i]] = s;
    nw[months[i]] = prev + s + returns[i - 1] * (prev + s / 2);
  }
  return { months, nw, sav };
}

describe('impliedMonthlyReturns', () => {
  const returns = [0.01, -0.02, 0.03, 0.005, -0.01, 0.02];
  const savings = [100, 5000, 100, 100, 6000, 100]; // lumpy, like bonus months

  it('recovers the returns that generated a net worth series, across a year boundary', () => {
    const { nw, sav } = buildSeries('2025-10', 100000, returns, savings);
    const got = impliedMonthlyReturns(nw, sav);
    assert.equal(got.length, returns.length);
    got.forEach((r, i) => assert.ok(Math.abs(r - returns[i]) < 1e-12, `month ${i}: ${r} vs ${returns[i]}`));
  });

  it('only uses months after the cutoff month', () => {
    const { nw, sav } = buildSeries('2025-10', 100000, returns, savings);
    // months: 2025-10 (start) .. 2026-04; returns are for 2025-11 .. 2026-04. Cut off after 2025-12.
    const got = impliedMonthlyReturns(nw, sav, '2025-12');
    assert.deepEqual(got.map((r) => Number(r.toFixed(6))), returns.slice(2).map((r) => Number(r.toFixed(6))));
  });

  it('skips months that lack net worth for this or the previous month, or lack savings', () => {
    const { nw, sav } = buildSeries('2025-10', 100000, returns, savings);
    delete nw['2025-12']; // removes the return for 2025-12 and for 2026-01 (previous month missing)
    delete sav['2026-03']; // removes the return for 2026-03
    const got = impliedMonthlyReturns(nw, sav);
    // remaining returns: 2025-11, 2026-02, 2026-04  -> indices 0, 3, 5
    assert.deepEqual(got.map((r) => Number(r.toFixed(6))), [returns[0], returns[3], returns[5]].map((r) => Number(r.toFixed(6))));
  });
});

describe('estimateVolatility', () => {
  const alternating = (n: number, size: number) => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? size : -size));

  it('annualizes the sample standard deviation of monthly returns', () => {
    const { value, source } = estimateVolatility(alternating(48, 0.04));
    assert.equal(source, 'data');
    // sample sd of +/-0.04 over 48 points = 0.04 * sqrt(48/47); annualized by sqrt(12)
    assert.ok(Math.abs(value - 0.04 * Math.sqrt(48 / 47) * Math.sqrt(12)) < 1e-12);
  });

  it('falls back to 15% when there are fewer than 36 clean months', () => {
    assert.deepEqual(estimateVolatility(alternating(35, 0.04)), { value: 0.15, source: 'default' });
    assert.deepEqual(estimateVolatility([]), { value: 0.15, source: 'default' });
  });

  it('clamps implausible estimates to 5%-30%', () => {
    assert.equal(estimateVolatility(alternating(48, 0.005)).value, 0.05);
    assert.equal(estimateVolatility(alternating(48, 0.15)).value, 0.3);
  });
});

describe('simulate', () => {
  const base = { startNetWorth: 100_000, annualSavings: 12_000, expectedRealReturn: 0, volatility: 0, goals: [150_000] };

  it('with no return and no volatility, reaches the goal when savings alone get there', () => {
    // 1,000/month: exactly 50 months to add 50,000
    const [hit] = simulate(base).hits;
    assert.deepEqual(hit, { alreadyThere: false, early: 50, median: 50, late: 50, probability: 1 });
  });

  it('with no volatility, matches the closed-form solution of NW\' = NW(1+r) + c', () => {
    const params = { ...base, startNetWorth: 200_000, annualSavings: 24_000, expectedRealReturn: 0.05, goals: [500_000] };
    const r = Math.pow(1.05, 1 / 12) - 1;
    const c = 2_000;
    const months = Math.ceil(Math.log((500_000 + c / r) / (200_000 + c / r)) / Math.log(1 + r));
    assert.equal(simulate(params).hits[0].median, months);
  });

  it('reports a net worth already at or above the goal as reached today', () => {
    const [hit] = simulate({ ...base, startNetWorth: 150_000 }).hits;
    assert.deepEqual(hit, { alreadyThere: true, early: 0, median: 0, late: 0, probability: 1 });
  });

  it('never reaches a goal with no savings and no return, so every date is null', () => {
    const [hit] = simulate({ ...base, annualSavings: 0 }).hits;
    assert.deepEqual(hit, { alreadyThere: false, early: null, median: null, late: null, probability: 0 });
  });

  it('returns null once the goal needs longer than the horizon', () => {
    const [hit] = simulate({ ...base, horizonMonths: 40 }).hits; // needs 50 months
    assert.deepEqual(hit, { alreadyThere: false, early: null, median: null, late: null, probability: 0 });
  });

  it('is deterministic for a given seed and changes with a different seed', () => {
    const noisy = { ...base, expectedRealReturn: 0.05, volatility: 0.15, paths: 1000 };
    const a = simulate(noisy), b = simulate(noisy), c = simulate({ ...noisy, seed: 7 });
    assert.deepEqual(a.hits, b.hits);
    assert.deepEqual(a.bands(24), b.bands(24));
    assert.notDeepEqual(a.bands(24), c.bands(24));
  });

  it('puts the 10th percentile of dates earlier than the median, and the median earlier than the 90th', () => {
    const [hit] = simulate({ ...base, expectedRealReturn: 0.05, volatility: 0.15, paths: 2000 }).hits;
    assert.ok(hit.early! < hit.median! && hit.median! < hit.late!, JSON.stringify(hit));
    assert.ok(hit.probability > 0.9);
  });

  it('reaches the goal sooner with a higher return and later with a higher goal (same random draws)', () => {
    const noisy = { ...base, volatility: 0.15, paths: 2000 };
    const low = simulate({ ...noisy, expectedRealReturn: 0.03, goals: [300_000] }).hits[0].median!;
    const high = simulate({ ...noisy, expectedRealReturn: 0.07, goals: [300_000] }).hits[0].median!;
    assert.ok(high < low, `7% (${high}) should beat 3% (${low})`);
    const [near, far] = simulate({ ...noisy, expectedRealReturn: 0.05, goals: [200_000, 400_000] }).hits;
    assert.ok(near.median! < far.median!);
  });

  it('bands start at the starting net worth and, with no volatility, collapse onto the deterministic path', () => {
    const b = simulate({ ...base, expectedRealReturn: 0.05 }).bands(12);
    assert.equal(b.p50.length, 13);
    assert.equal(b.p10[0], 100_000);
    const r = Math.pow(1.05, 1 / 12) - 1;
    const expected = 100_000 * Math.pow(1 + r, 12) + 1_000 * (Math.pow(1 + r, 12) - 1) / r;
    for (const arr of [b.p10, b.p50, b.p90]) assert.ok(Math.abs(arr[12] - expected) < 1e-6);
  });

  it('draws lognormal returns: median and spread of terminal net worth match theory', () => {
    // No savings, goal out of reach, so bands show pure compounding of random returns over 5 years.
    const mu = 0.06, sigma = 0.2, months = 60;
    const { bands } = simulate({ startNetWorth: 100_000, annualSavings: 0, expectedRealReturn: mu, volatility: sigma, goals: [1e12], paths: 20_000, horizonMonths: months });
    const b = bands(months);
    const mMonthly = Math.log(1 + (Math.pow(1 + mu, 1 / 12) - 1)) - (sigma * sigma / 12) / 2; // mean of log return per month
    const meanLog = months * mMonthly;
    const sdLog = (sigma / Math.sqrt(12)) * Math.sqrt(months);
    const within = (got: number, want: number, tol: number) => assert.ok(Math.abs(got / want - 1) < tol, `${got} vs ${want}`);
    within(b.p50[months], 100_000 * Math.exp(meanLog), 0.02);
    within(b.p90[months], 100_000 * Math.exp(meanLog + 1.2816 * sdLog), 0.03);
    within(b.p10[months], 100_000 * Math.exp(meanLog - 1.2816 * sdLog), 0.03);
  });
});

describe('savingsByMonth', () => {
  it('is take-home minus spending for each month from the first to the last paycheck', () => {
    const { months, byMonth } = savingsByMonth(
      { '2025-11': 5000, '2026-01': 9000 }, // no paycheck recorded for December
      { '2025-10': 999, '2025-11': 3000, '2025-12': 3000, '2026-01': 3000, '2026-02': 999 }
    );
    assert.deepEqual(months, ['2025-11', '2025-12', '2026-01']); // spend outside the paycheck range is ignored
    assert.deepEqual(byMonth, { '2025-11': 2000, '2025-12': -3000, '2026-01': 6000 }); // missing paycheck counts as 0
  });

  it('treats a month with no spending row as zero spending', () => {
    assert.deepEqual(savingsByMonth({ '2026-01': 100 }, {}).byMonth, { '2026-01': 100 });
  });

  it('is empty when there are no paychecks', () => {
    assert.deepEqual(savingsByMonth({}, { '2026-01': 100 }), { months: [], byMonth: {} });
  });
});

describe('monthEndNetWorth', () => {
  it('keeps the latest observation in each month', () => {
    const got = monthEndNetWorth([
      { date: new Date('2026-01-31T00:00:00Z'), value: 120 },
      { date: new Date('2026-01-15T00:00:00Z'), value: 100 },
      { date: new Date('2026-02-28T00:00:00Z'), value: 130 },
    ]);
    assert.deepEqual(got, { '2026-01': 120, '2026-02': 130 });
  });
});

describe('addMonths', () => {
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  it('moves by calendar months', () => {
    assert.equal(iso(addMonths(new Date('2026-10-31T00:00:00Z'), 14)), '2027-12-31');
    assert.equal(iso(addMonths(new Date('2026-11-15T00:00:00Z'), 0)), '2026-11-15');
  });

  it('clamps to the end of a shorter month instead of spilling into the next', () => {
    assert.equal(iso(addMonths(new Date('2026-01-31T00:00:00Z'), 1)), '2026-02-28');
    assert.equal(iso(addMonths(new Date('2027-12-31T00:00:00Z'), 2)), '2028-02-29'); // leap year
  });
});
