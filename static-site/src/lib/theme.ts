/**
 * Theme system ported from Python theme.py
 * "Midnight Vault" - Swiss Banking aesthetic in dark mode
 */

import Decimal from 'decimal.js';

// Color palette - Midnight Vault (Dark Mode)
export const COLORS = {
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

// Typography
export const FONTS = {
  display: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
  body: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
} as const;

// Plotly chart template - Dark and refined
export const CHART_TEMPLATE = {
  paper_bgcolor: COLORS.card,
  plot_bgcolor: COLORS.card,
  font: {
    family: FONTS.body,
    color: COLORS.textSecondary,
    size: 12,
  },
  title: {
    font: {
      family: FONTS.display,
      size: 20,
      color: COLORS.textPrimary,
    },
    x: 0,
    xanchor: 'left' as const,
  },
  xaxis: {
    gridcolor: COLORS.divider,
    linecolor: COLORS.border,
    tickfont: { size: 14, color: COLORS.textMuted },
    showgrid: false,
    zeroline: false,
  },
  yaxis: {
    gridcolor: COLORS.border,
    linecolor: 'rgba(0,0,0,0)',
    tickfont: { size: 14, color: COLORS.textMuted },
    showgrid: true,
    gridwidth: 1,
    zeroline: false,
  },
  legend: {
    bgcolor: 'rgba(0,0,0,0)',
    font: { color: COLORS.textSecondary, size: 11 },
    orientation: 'h' as const,
    yanchor: 'bottom' as const,
    y: 1.02,
    xanchor: 'left' as const,
    x: 0,
  },
  margin: { t: 60, r: 24, b: 48, l: 60 },
  hoverlabel: {
    bgcolor: COLORS.cardElevated,
    font: { color: COLORS.textPrimary, family: FONTS.body },
    bordercolor: COLORS.borderStrong,
  },
};

// FIRE Goal - hardcoded as in Python version
export const FIRE_GOAL = new Decimal('4250000');

// SWR rates for sensitivity analysis
export const SWR_RATES = [
  new Decimal('0.03'),
  new Decimal('0.035'),
  new Decimal('0.04'),
  new Decimal('0.045'),
];

/**
 * Format a number as USD currency.
 * Matches Python theme.py format_currency()
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
 * Format a number as a percentage.
 * Matches Python theme.py format_percentage()
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
 * Matches Python theme.py format_change()
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
