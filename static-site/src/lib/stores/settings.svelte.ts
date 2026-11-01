/**
 * Svelte 5 rune-based settings store.
 * Persists user-configurable app settings to localStorage.
 */

import Decimal from 'decimal.js';
import {
  stepExpectedReturn,
  parseStoredExpectedReturn,
  EXPECTED_RETURN_MIN,
  EXPECTED_RETURN_MAX,
} from './expected-return';

export { EXPECTED_RETURN_MIN, EXPECTED_RETURN_MAX };

const STORAGE_KEY = 'fire-goal';
const RETURN_STORAGE_KEY = 'expected-real-return';

export const DEFAULT_FIRE_GOAL = new Decimal('4250000');
export const FIRE_GOAL_MIN = new Decimal('1000000');
export const FIRE_GOAL_MAX = new Decimal('10000000');
export const FIRE_GOAL_STEP = new Decimal('250000');

class Settings {
  fireGoal = $state<Decimal>(loadFromStorage());
  /** Expected annual return after inflation, used by the FIRE projection. */
  expectedRealReturn = $state<number>(loadReturnFromStorage());

  increment() {
    const next = this.fireGoal.add(FIRE_GOAL_STEP);
    if (next.lte(FIRE_GOAL_MAX)) this._set(next);
  }

  decrement() {
    const next = this.fireGoal.sub(FIRE_GOAL_STEP);
    if (next.gte(FIRE_GOAL_MIN)) this._set(next);
  }

  incrementReturn() {
    this._setReturn(stepExpectedReturn(this.expectedRealReturn, 1));
  }

  decrementReturn() {
    this._setReturn(stepExpectedReturn(this.expectedRealReturn, -1));
  }

  private _setReturn(value: number) {
    this.expectedRealReturn = value;
    if (typeof window !== 'undefined') {
      localStorage.setItem(RETURN_STORAGE_KEY, String(value));
    }
  }

  private _set(value: Decimal) {
    this.fireGoal = value;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value.toString());
    }
  }
}

function loadFromStorage(): Decimal {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const v = new Decimal(stored);
      if (v.gte(FIRE_GOAL_MIN) && v.lte(FIRE_GOAL_MAX)) return v;
    }
  } catch {}
  return DEFAULT_FIRE_GOAL;
}

function loadReturnFromStorage(): number {
  try {
    return parseStoredExpectedReturn(localStorage.getItem(RETURN_STORAGE_KEY));
  } catch {
    return parseStoredExpectedReturn(null);
  }
}

export const settings = new Settings();
