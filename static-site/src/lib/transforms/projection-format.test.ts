import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatFireDate, formatFireRange, formatAssumptions } from './projection-format.ts';
import type { FireDateEstimate, ProjectionAssumptions } from '../data/types.ts';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const estimate = (over: Partial<FireDateEstimate> = {}): FireDateEstimate => ({
  alreadyThere: false,
  earlyDate: day('2028-06-30'),
  medianDate: day('2029-09-30'),
  lateDate: day('2031-03-31'),
  medianYears: 2.9,
  probability: 1,
  ...over,
});

describe('formatFireDate', () => {
  it('shows the median as month and year', () => {
    assert.equal(formatFireDate(estimate()), 'Sep 2029');
  });

  it('shows FIRE Ready when the goal is already met', () => {
    assert.equal(formatFireDate(estimate({ alreadyThere: true })), 'FIRE Ready');
  });

  it('says so when the median is beyond the 30-year horizon', () => {
    assert.equal(formatFireDate(estimate({ medianDate: null, medianYears: null, lateDate: null })), 'Beyond 30 years');
  });

  it('does not shift the month in timezones behind UTC', () => {
    // 1 July 00:00 UTC must read as Jul, not Jun, wherever the browser is
    assert.equal(formatFireDate(estimate({ medianDate: day('2030-07-01') })), 'Jul 2030');
  });
});

describe('formatFireRange', () => {
  it('gives the median distance and the likely range', () => {
    assert.equal(
      formatFireRange(estimate()),
      'About 2.9 years at the median; likely Jun 2028 to Mar 2031 (10th–90th percentile)'
    );
  });

  it('says beyond 30 years when only the late end is out of reach', () => {
    assert.equal(
      formatFireRange(estimate({ lateDate: null, medianYears: 12 })),
      'About 12.0 years at the median; likely Jun 2028 to beyond 30 years (10th–90th percentile)'
    );
  });

  it('celebrates a target that is already reached', () => {
    assert.equal(formatFireRange(estimate({ alreadyThere: true })), 'Target reached!');
  });

  it('reports how often the goal is reached when the median is out of reach', () => {
    const e = estimate({ medianDate: null, medianYears: null, lateDate: null, probability: 0.37 });
    assert.equal(formatFireRange(e), 'Reached in 37% of simulations within 30 years');
  });

  it('reports a goal that is never reached', () => {
    const e = estimate({ earlyDate: null, medianDate: null, medianYears: null, lateDate: null, probability: 0 });
    assert.equal(formatFireRange(e), 'Not reached in any simulation within 30 years');
  });
});

describe('formatAssumptions', () => {
  const assumptions: ProjectionAssumptions = {
    startNetWorth: 500_000,
    annualSavings: 24_000,
    expectedRealReturn: 0.05,
    volatility: 0.125,
    volatilitySource: 'data',
    goal: 1_000_000,
  };

  it('lists return, volatility with its source, and savings', () => {
    assert.equal(
      formatAssumptions(assumptions),
      'Assumes a 5.0% real return, 12.5% volatility (from your history) and $24,000 saved per year'
    );
  });

  it('flags a default volatility', () => {
    assert.equal(
      formatAssumptions({ ...assumptions, volatility: 0.15, volatilitySource: 'default' }),
      'Assumes a 5.0% real return, 15.0% volatility (default; not enough history) and $24,000 saved per year'
    );
  });
});
