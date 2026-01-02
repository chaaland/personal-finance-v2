# FIRE Dashboard Enhancement Design

## Overview

Add FIRE (Financial Independence, Retire Early) tracking to the personal finance dashboard. The goal is to show progress toward financial independence using actual historical data rather than theoretical return assumptions.

## Design Decisions

- **Withdrawal rate**: Configurable, default 4%
- **Projection method**: Linear extrapolation from recent net worth growth (not fixed % return)
- **Lookback period**: Configurable, default 3 years
- **Chart horizon**: Historical data + 2 years projection (near-term focus)
- **FIRE number calculation**: `projected_annual_spend / withdrawal_rate`

## Summary Tab Additions

Two new metric cards alongside existing cards (Net Worth, Total Comp, Projected Spend, Savings Rate):

### FIRE Progress Card
- **Primary value**: Percentage to FIRE (e.g., "42% to FIRE")
- **Subtext**: Current net worth vs FIRE number (e.g., "$840K / $2.0M")
- **Calculation**: `current_net_worth / fire_number * 100`

### Projected FIRE Date Card
- **Primary value**: Month and year (e.g., "Oct 2034")
- **Subtext**: Years remaining (e.g., "8.5 years at current pace")
- **Edge case**: Show "FIRE Ready" if already at FIRE number

## New FIRE Tab

New tab added after Spending tab.

### Configuration Row
Compact row at top of tab with two inputs:
- **Withdrawal Rate**: Number input with "%" suffix, default 4.0
- **Lookback Period**: Number input with "years" suffix, default 3

Changes update all metrics and chart reactively via Dash callbacks.

### Metrics Row
Three metric cards:

1. **FIRE Number**
   - Primary: Dollar amount (e.g., "$2.0M")
   - Subtext: "at X% withdrawal rate"

2. **Current Runway**
   - Primary: Years (e.g., "12.3 years")
   - Subtext: "if you stopped working today"
   - Calculation: `current_net_worth / projected_annual_spend`

3. **Projected FIRE Date**
   - Primary: Month and year
   - Subtext: Years from now

### Projection Chart
Line chart showing net worth trajectory:

- **X-axis**: Time, from earliest net worth data to 2 years in future
- **Y-axis**: Net worth (USD) with $ prefix
- **Historical line**: Solid line showing actual net worth over time
- **Projection line**: Dashed line extrapolating from recent growth rate
- **FIRE threshold**: Horizontal line at FIRE number
- **Visual**: Subtle shading below FIRE line to emphasize gap

#### Projection Calculation

1. Filter net worth data to lookback period (default: last 3 years)
2. Calculate average annual net worth increase over that period
3. Project forward by adding that annual rate linearly
4. Intersection with FIRE number determines projected FIRE date

## Data Requirements

Uses existing data from loader:
- `networth_df`: Historical net worth (for trajectory and current value)
- `spending_df`: Spending data (for projected annual spend)

New transforms needed in `transforms/fire.py`:
- `get_fire_number(spending_df, withdrawal_rate)`
- `get_fire_progress_pct(networth_df, spending_df, withdrawal_rate)`
- `get_annual_nw_growth(networth_df, lookback_years)`
- `get_projected_fire_date(networth_df, spending_df, withdrawal_rate, lookback_years)`
- `get_current_runway_years(networth_df, spending_df)`
- `get_fire_projection_series(networth_df, spending_df, withdrawal_rate, lookback_years, projection_years)`

## UI Components

New components in `components/fire.py`:
- `create_fire_config_row(withdrawal_rate, lookback_years)` - Input controls
- `create_fire_metrics_row(fire_number, runway, projected_date)` - Three metric cards
- `create_fire_projection_chart(historical_df, projection_df, fire_number)` - Main chart

## Styling

Follows existing Swiss banking theme:
- Same card styling as other tabs
- Chart uses `PLOTLY_TEMPLATE` from theme
- Projection line uses dashed style to distinguish from historical
- FIRE threshold line uses accent color (copper)
