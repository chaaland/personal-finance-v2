/**
 * Theme system: colors, chart template, and formatters.
 * "Midnight Vault" - Swiss Banking aesthetic in dark mode
 * "Ivory Ledger" - Warm parchment aesthetic in light mode
 */

import Decimal from 'decimal.js';
import type { AccountType } from '$lib/data/types';

// Color palette - Midnight Vault (Dark Mode)
const COLORS = {
  // Backgrounds - Deep obsidian with warm undertones
  background: '#0D0D0F',
  card: '#18181B',
  cardElevated: '#1F1F23',

  // Text - High contrast with warm whites
  textPrimary: '#FAFAF9',
  textSecondary: '#A8A29E',
  textMuted: '#78716C',

  // Accents - Burnished gold/champagne
  accent: '#D4A853',
  accentLight: '#E5C06E',
  accentGlow: 'rgba(212, 168, 83, 0.15)',

  // Semantic - Muted tones for refined dark aesthetic
  positive: '#6EBF8B',
  positiveBg: 'rgba(110, 191, 139, 0.12)',
  negative: '#E07A7A',
  negativeBg: 'rgba(224, 122, 122, 0.12)',

  // Charts - Muted, sophisticated palette for professional finance
  chart1: '#D4A853',
  chart2: '#7BA3C9',
  chart3: '#6EBF8B',
  chart4: '#D4956A',
  chart5: '#B8A9C9', // muted lavender
  chart6: '#D4956A', // terracotta
  chart7: '#7BA3A3', // muted teal
  chart8: '#8B9EB3', // cool slate
  chart9: '#C9A86C', // muted ochre

  // Borders and lines - Subtle dark borders
  border: '#27272A',
  borderStrong: '#3F3F46',
  divider: '#1F1F23',
} as const;

// Color palette - Ivory Ledger (Light Mode)
const LIGHT_COLORS = {
  // Backgrounds - Warm parchment
  background: '#F5F2EB',
  card: '#FAFAF5',
  cardElevated: '#FFFFFF',

  // Text - Dark warm tones for readability
  textPrimary: '#1A1714',
  textSecondary: '#6B6560',
  textMuted: '#9B918A',

  // Accents - Deeper gold for light backgrounds
  accent: '#B07A1A',
  accentLight: '#C99027',
  accentGlow: 'rgba(176, 122, 26, 0.10)',

  // Semantic - Richer tones for light aesthetic
  positive: '#1E7A45',
  positiveBg: 'rgba(30, 122, 69, 0.08)',
  negative: '#B83232',
  negativeBg: 'rgba(184, 50, 50, 0.08)',

  // Charts - Deeper saturated palette for light backgrounds
  chart1: '#B07A1A',
  chart2: '#3A6B96',
  chart3: '#1E7A45',
  chart4: '#B8622A',
  chart5: '#7A5B9B',
  chart6: '#B8622A',
  chart7: '#3D8A8A',
  chart8: '#516080',
  chart9: '#9E7520',

  // Borders - Warm light borders
  border: '#DDD8CE',
  borderStrong: '#C5BEB4',
  divider: '#EAE5DC',
} as const;

// Typography
const FONTS = {
  display: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
  body: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
} as const;

// Theme-aware color and template factories
export function getColors(isDark: boolean) {
  return isDark ? COLORS : LIGHT_COLORS;
}

export type ChartColors = ReturnType<typeof getColors>;
export type ChartTemplate = ReturnType<typeof getChartTemplate>;

export function getChartTemplate(isDark: boolean) {
  const c = getColors(isDark);
  return {
    paper_bgcolor: c.card,
    plot_bgcolor: c.card,
    font: {
      family: FONTS.body,
      color: c.textSecondary,
      size: 12,
    },
    title: {
      font: {
        family: FONTS.display,
        size: 20,
        color: c.textPrimary,
      },
      x: 0,
      xanchor: 'left' as const,
    },
    xaxis: {
      gridcolor: c.divider,
      linecolor: c.border,
      tickfont: { size: 14, color: c.textMuted },
      showgrid: false,
      zeroline: false,
    },
    yaxis: {
      gridcolor: c.border,
      linecolor: 'rgba(0,0,0,0)',
      tickfont: { size: 14, color: c.textMuted },
      showgrid: true,
      gridwidth: 1,
      zeroline: false,
    },
    legend: {
      bgcolor: 'rgba(0,0,0,0)',
      font: { color: c.textSecondary, size: 11 },
      orientation: 'h' as const,
      yanchor: 'bottom' as const,
      y: 1.02,
      xanchor: 'left' as const,
      x: 0,
    },
    margin: { t: 60, r: 24, b: 48, l: 60 },
    hoverlabel: {
      bgcolor: c.cardElevated,
      font: { color: c.textPrimary, family: FONTS.body },
      bordercolor: c.borderStrong,
    },
  };
}

// "Stratified Wealth" palette for retirement accounts - desaturated jewel tones,
// ordered from warm (cash/liquid) to cool (tax-advantaged growth). RGB triples.
const ACCOUNT_RGB: Record<AccountType, string> = {
  'UK Cash': '196, 167, 125',
  HYSA: '251, 191, 114',
  Coinbase: '245, 158, 89',
  'Taxable Brokerage': '134, 182, 159',
  'UK Pension': '124, 165, 184',
  '401k': '116, 165, 193',
  IRA: '147, 141, 194',
  HSA: '99, 179, 171',
  'Roth IRA': '176, 147, 182',
};

/** Translucent fill and stronger outline colors for an account type. */
export function getAccountColors(account: AccountType): { fill: string; line: string } {
  const rgb = ACCOUNT_RGB[account];
  return { fill: `rgba(${rgb}, 0.55)`, line: `rgba(${rgb}, 0.85)` };
}

/** An rgba() color from a 6-digit hex color and an opacity. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`withAlpha expects a 6-digit hex color, got "${hex}"`);
  const value = parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/**
 * Format a number as USD currency.
 */
export function formatCurrency(value: Decimal | number): string {
  const v = typeof value === 'number' ? value : value.toNumber();
  if (Math.abs(v) >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(2)}M`;
  } else if (Math.abs(v) >= 1_000) {
    return `$${(v / 1_000).toFixed(1)}K`;
  } else {
    return `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
}

/**
 * Format a number as whole US dollars with thousands separators (e.g. "$1,234,567").
 * Use for explanatory text and chart labels; formatCurrency gives the compact form ("$1.23M").
 */
export function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Format a number as a percentage.
 */
export function formatPercentage(value: Decimal | number): string {
  const v = typeof value === 'number' ? value : value.toNumber();
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export interface ChangeDisplay {
  text: string;
  isPositive: boolean;
}

/**
 * Format a change value with appropriate styling info.
 */
export function formatChange(
  value: Decimal | number,
  isPercentage: boolean = false,
  invertColors: boolean = false,
  absoluteValue?: Decimal | number
): ChangeDisplay {
  const v = typeof value === 'number' ? value : value.toNumber();

  let text: string;
  if (isPercentage) {
    text = formatPercentage(v);
  } else {
    const sign = v >= 0 ? '+' : '';
    text = `${sign}${formatCurrency(v)}`;
  }

  // Combine absolute and percentage if both provided
  if (absoluteValue !== undefined) {
    const absV = typeof absoluteValue === 'number' ? absoluteValue : absoluteValue.toNumber();
    const absSign = absV >= 0 ? '+' : '';
    text = `${absSign}${formatCurrency(absV)} / ${formatPercentage(v)}`;
  }

  let isPositive = v >= 0;
  if (invertColors) {
    isPositive = !isPositive;
  }

  return { text, isPositive };
}
