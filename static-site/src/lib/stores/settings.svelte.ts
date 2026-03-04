/**
 * Svelte 5 rune-based settings store.
 * Persists user-configurable app settings to localStorage.
 */

import Decimal from 'decimal.js';

const STORAGE_KEY = 'fire-goal';

export const DEFAULT_FIRE_GOAL = new Decimal('4250000');
export const FIRE_GOAL_MIN = new Decimal('1000000');
export const FIRE_GOAL_MAX = new Decimal('10000000');
export const FIRE_GOAL_STEP = new Decimal('250000');

class Settings {
  fireGoal = $state<Decimal>(loadFromStorage());

  increment() {
    const next = this.fireGoal.add(FIRE_GOAL_STEP);
    if (next.lte(FIRE_GOAL_MAX)) this._set(next);
  }

  decrement() {
    const next = this.fireGoal.sub(FIRE_GOAL_STEP);
    if (next.gte(FIRE_GOAL_MIN)) this._set(next);
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

export const settings = new Settings();
