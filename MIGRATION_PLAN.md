# Personal Finance Dashboard: Static Site Migration Plan

## Overview

Migrate the Python/Dash personal finance dashboard to a static site that can be hosted on GitHub Pages. All data processing happens client-side in the browser for privacy.

## Technology Stack

| Layer | Current | New |
|-------|---------|-----|
| **Frontend** | Dash (Python) | Svelte 5 |
| **Build Tool** | N/A | Vite |
| **Data Processing** | Polars | DuckDB-WASM (SQL in browser) |
| **Charts** | Plotly (Python) | Plotly.js |
| **Precision** | Python Decimal | decimal.js + DuckDB DECIMAL(15,4) |
| **File Upload** | Dash Upload | Native `<input type="file">` |
| **Hosting** | Local server | GitHub Pages (static) |

## Key Design Decisions

1. **Excel upload only** - Same format as current (7 sheets)
2. **No persistence** - User re-uploads each session
3. **FIRE goal hardcoded** - $4,250,000 (same as current)
4. **Summary tab MVP** - Get this working first, then add other tabs

---

## Project Structure

```
static-site/
├── src/
│   ├── lib/
│   │   ├── data/
│   │   │   ├── loader.ts          # Excel → DuckDB ingestion
│   │   │   ├── database.ts        # DuckDB-WASM singleton
│   │   │   └── types.ts           # TypeScript interfaces for FinanceData
│   │   ├── transforms/
│   │   │   ├── networth.ts        # Net worth SQL queries
│   │   │   ├── income.ts          # Income SQL queries
│   │   │   ├── spending.ts        # Spending SQL queries
│   │   │   ├── savings.ts         # Savings rate SQL queries
│   │   │   └── fire.ts            # FIRE calculations (SQL + LAD regression)
│   │   ├── components/
│   │   │   ├── cards/
│   │   │   │   ├── MetricCard.svelte
│   │   │   │   ├── ExpandableCard.svelte
│   │   │   │   ├── FIREProgressCard.svelte
│   │   │   │   └── FIREDateCard.svelte
│   │   │   ├── charts/
│   │   │   │   ├── PlotlyChart.svelte
│   │   │   │   ├── SWRSensitivityChart.svelte
│   │   │   │   ├── NetWorthChart.svelte
│   │   │   │   └── AssetAllocationChart.svelte
│   │   │   ├── tabs/
│   │   │   │   ├── SummaryTab.svelte
│   │   │   │   ├── NetWorthTab.svelte
│   │   │   │   ├── IncomeTab.svelte
│   │   │   │   ├── SpendingTab.svelte
│   │   │   │   └── FIRETab.svelte
│   │   │   ├── Header.svelte
│   │   │   ├── TabBar.svelte
│   │   │   ├── FileUpload.svelte
│   │   │   └── EmptyState.svelte
│   │   ├── stores/
│   │   │   └── data.ts            # Svelte stores for app state
│   │   └── theme.ts               # Colors, fonts, formatters
│   ├── App.svelte                 # Main app shell
│   ├── main.ts                    # Entry point
│   └── app.css                    # Global styles + CSS variables
├── public/
│   └── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Implementation Phases

### Phase 1: Foundation + Summary Tab (MVP)

**Goal**: Replicate the Summary tab exactly as it appears in the Python version.

#### Step 1.1: Project Setup
- [x] Create Vite + Svelte + TypeScript project
  - Created: `static-site/package.json`
  - Created: `static-site/vite.config.ts`
  - Created: `static-site/tsconfig.json`
  - Created: `static-site/tsconfig.node.json`
  - Created: `static-site/svelte.config.js`
  - Created: `static-site/public/index.html`
- [x] Install dependencies: @duckdb/duckdb-wasm, xlsx, plotly.js-dist-min, decimal.js
- [x] Configure TypeScript strict mode
- [x] Set up Vite config with WASM support

#### Step 1.2: Theme System
Port from `src/personal_finance/theme.py`:
- [x] COLORS object → TypeScript constants
  - Created: `static-site/src/lib/theme.ts`
- [x] FONTS object → TypeScript constants
- [x] STYLES object → Svelte component styles (in app.css as CSS variables)
- [x] formatCurrency() function
- [x] formatPercentage() function
- [x] formatChange() function
- [x] CHART_TEMPLATE → Plotly layout config
- [x] FIRE_GOAL constant ($4,250,000)
- [x] SWR_RATES array

#### Step 1.3: Data Layer
- [x] TypeScript interfaces for FinanceData (mirrors Python dataclass)
  - Created: `static-site/src/lib/data/types.ts`
- [x] DuckDB-WASM initialization (singleton pattern)
  - Created: `static-site/src/lib/data/database.ts`
- [x] Excel loader using xlsx library
  - Created: `static-site/src/lib/data/loader.ts`
- [x] SQL table creation with DECIMAL(15,4) for currency
- [x] Svelte stores for app state
  - Created: `static-site/src/lib/stores/data.ts`

#### Step 1.4: Core Transforms

**networth.ts** - Port from `transforms/networth.py`:

- [x] getCombinedNetworth() - SQL with forward-fill (replaces join_asof)
- [x] getCurrentNetworth()
- [x] getYtdNetworthChange()
- [x] getYtdNetworthDetails()

**income.ts** - Port from `transforms/income.py`:

- [x] getYtdGrossIncome()
- [x] getYoyIncomeComparison()
- [x] getYtdIncomeDetails()

**spending.ts** - Port from `transforms/spending.py`:

- [x] getCombinedSpending()
- [x] getYtdSpending()
- [x] getProjectedAnnualSpend()
- [x] getYoySpendingComparison()
- [x] getSpendingProjectionDetails()

**savings.ts** - Port from `transforms/savings.py`:

- [x] getCurrentYearSavingsRate()
- [x] getSavingsRateDetails()

**fire.ts** - Port from `transforms/fire.py`:

- [x] getFireNumber()
- [x] getFireProgressPct()
- [x] getCurrentRunwayYears()
- [x] getProjectedFireDate() (includes LAD regression in JS)
- [x] getSwrSensitivity()

#### Step 1.5: Card Components
Port from `components/cards.py`:
- [x] MetricCard.svelte
- [x] ExpandableCard.svelte (with chevron toggle)
- [x] FIREProgressCard.svelte
- [x] FIREDateCard.svelte

#### Step 1.6: SWR Sensitivity Chart
Port from `components/summary.py:35-105`:
- [x] Horizontal bar chart using Plotly.js
- [x] Shows FIRE dates at 3%, 3.5%, 4%, 4.5% withdrawal rates

#### Step 1.7: Summary Tab
Port from `components/summary.py:108-211`:
- [x] 3x2 grid of metric cards
- [x] SWR sensitivity chart below
- [x] Wire up all transforms

#### Step 1.8: Layout Components
- [x] Header.svelte (title + upload button)
- [x] FileUpload.svelte (file picker)
- [x] TabBar.svelte (tab navigation)
- [x] EmptyState.svelte (no data loaded state)

#### Step 1.9: App Shell
- [x] App.svelte with header, tabs, content area
- [x] Svelte store for current data (using $state runes)
- [x] Reactive updates on file upload

**Validation Checkpoint**: Summary tab should match Python version pixel-perfect.

---

### Phase 2: Net Worth Tab

**Goal**: Add the Net Worth tab with all charts.

#### Step 2.1: Additional Transforms
- [x] getYoyNetworthChanges() for bar chart
  - Created: `static-site/src/lib/transforms/networth.ts`
- [x] getFireProjectionSeries() for chart projection line
  - Created: `static-site/src/lib/transforms/fire.ts`
- [x] getAssetAllocationByStock() and getAssetAllocationByAccountType() for donut charts
  - Created: `static-site/src/lib/transforms/networth.ts`

#### Step 2.2: Charts
- [x] Net worth over time chart (multi-line: Total, US, UK)
  - Created: `static-site/src/lib/components/charts/NetWorthChart.svelte`
- [x] FIRE projection line (dashed)
- [x] FIRE target threshold (dotted horizontal)
- [x] Asset allocation donut charts (by stock, by account type)
  - Created: `static-site/src/lib/components/charts/AssetAllocationChart.svelte`
- [x] Region selector (US/UK/All toggle)
- [x] YoY change bar chart
  - Created: `static-site/src/lib/components/charts/YoYNetworthChart.svelte`

#### Step 2.3: Tab Component
- [x] NetWorthTab.svelte
  - Created: `static-site/src/lib/components/tabs/NetWorthTab.svelte`

---

### Phase 3: Income Tab

**Goal**: Add the Income tab.

#### Step 3.1: Additional Transforms
- [x] getIncomeByYear() for grouped bar chart
  - Created: `static-site/src/lib/transforms/income.ts`

#### Step 3.2: Charts
- [x] Annual income grouped bar chart (Gross vs Net)
  - Created: `static-site/src/lib/components/charts/IncomeChart.svelte`

#### Step 3.3: Tab Component
- [x] IncomeTab.svelte with metric cards + chart
  - Created: `static-site/src/lib/components/tabs/IncomeTab.svelte`

---

### Phase 4: Spending Tab

**Goal**: Add the Spending tab.

#### Step 4.1: Additional Transforms
- [x] getMonthlySpendingWithMedian()
  - Created: `static-site/src/lib/transforms/spending.ts`
- [x] getSpendingByYear()
  - Created: `static-site/src/lib/transforms/spending.ts`
- [x] getSavingsRateByYear()
  - Created: `static-site/src/lib/transforms/savings.ts`

#### Step 4.2: Charts
- [x] Monthly spending line chart (raw + rolling median)
  - Created: `static-site/src/lib/components/charts/MonthlySpendingChart.svelte`
- [x] Annual spending bar chart
  - Created: `static-site/src/lib/components/charts/AnnualSpendingChart.svelte`
- [x] Savings rate by year bar chart (conditional colors)
  - Created: `static-site/src/lib/components/charts/SavingsRateChart.svelte`

#### Step 4.3: Tab Component
- [x] SpendingTab.svelte
  - Created: `static-site/src/lib/components/tabs/SpendingTab.svelte`

---

### Phase 5: FIRE Tab

**Goal**: Add the FIRE tab with retirement simulations.

#### Step 5.1: Additional Transforms
Port from `transforms/fire.py:313-460`:
- [x] getRetirementDrawdownSeries() - Complex simulation with account-specific rules
  - Created: `static-site/src/lib/transforms/fire.ts`
- [x] Account withdrawal order logic (WITHDRAWAL_ORDER constant)
- [x] Growth rate application per account type (GROWTH_ACCOUNTS set)

#### Step 5.2: Charts
- [x] Portfolio balance stacked area chart (by account type)
  - Created: `static-site/src/lib/components/charts/PortfolioDrawdownChart.svelte`
- [x] Annual retirement income stacked bar chart
  - Created: `static-site/src/lib/components/charts/WithdrawalSourceChart.svelte`

#### Step 5.3: Tab Component
- [x] FIRETab.svelte with metric row + both charts
  - Created: `static-site/src/lib/components/tabs/FIRETab.svelte`

---

### Phase 6: Polish & Deploy

- [x] Error handling for invalid Excel files
  - Added validation in `static-site/src/lib/data/loader.ts` (sheet data, dates, numbers)
  - Created `static-site/src/lib/components/ErrorDisplay.svelte` for structured error display
  - Graceful degradation: warnings for optional sheets, errors for required sheets
- [x] Loading states during data processing
  - Three-phase loading: initializing → processing → ready
  - Progress callback shows sheet-by-sheet loading progress
  - Updated `static-site/src/App.svelte` with loading phases
- [x] Optimize bundle size
  - Configured Vite chunk splitting (plotly, xlsx, duckdb as separate chunks)
  - Vite 5.4 for Svelte 5 compatibility
- [x] Build static site
  - Base path set to `/personal-finance-v2/` for GitHub Pages
  - Added `static-site/public/coi-serviceworker.js` for SharedArrayBuffer support
- [x] Deploy to GitHub Pages
  - Created `.github/workflows/deploy.yml` for automated deployment
  - Triggers on push to main branch

---

## SQL Query Reference

### Combined Net Worth with Forward Fill

Replaces Polars `join_asof` with SQL window functions:

```sql
WITH all_dates AS (
  SELECT dates FROM us_networth
  UNION
  SELECT dates FROM uk_networth
),
us_filled AS (
  SELECT
    a.dates,
    (SELECT u.net * u.conversion
     FROM us_networth u
     WHERE u.dates <= a.dates
     ORDER BY u.dates DESC
     LIMIT 1) AS us_usd
  FROM all_dates a
),
uk_filled AS (
  SELECT
    a.dates,
    (SELECT k.net * k.conversion
     FROM uk_networth k
     WHERE k.dates <= a.dates
     ORDER BY k.dates DESC
     LIMIT 1) AS uk_usd
  FROM all_dates a
)
SELECT
  u.dates,
  COALESCE(u.us_usd, 0) AS us_usd,
  COALESCE(k.uk_usd, 0) AS uk_usd,
  COALESCE(u.us_usd, 0) + COALESCE(k.uk_usd, 0) AS total_usd
FROM us_filled u
JOIN uk_filled k ON u.dates = k.dates
ORDER BY u.dates
```

### YTD Net Worth Change

```sql
WITH combined AS (
  -- Use combined networth CTE from above
),
current_info AS (
  SELECT
    MAX(dates) AS max_date,
    EXTRACT(YEAR FROM MAX(dates)) AS current_year
  FROM combined
),
year_data AS (
  SELECT c.*, ci.current_year
  FROM combined c, current_info ci
  WHERE EXTRACT(YEAR FROM c.dates) = ci.current_year
  ORDER BY c.dates
)
SELECT
  FIRST(total_usd ORDER BY dates) AS start_value,
  LAST(total_usd ORDER BY dates) AS end_value,
  LAST(total_usd ORDER BY dates) - FIRST(total_usd ORDER BY dates) AS change,
  (LAST(total_usd ORDER BY dates) - FIRST(total_usd ORDER BY dates))
    / FIRST(total_usd ORDER BY dates) * 100 AS change_pct
FROM year_data
```

### Projected Annual Spend

```sql
WITH ytd AS (
  SELECT SUM(total * conversion) AS ytd_spend
  FROM (
    SELECT dates, total, conversion FROM us_spend
    UNION ALL
    SELECT dates, total, conversion FROM uk_spend
  )
  WHERE EXTRACT(YEAR FROM dates) = (SELECT EXTRACT(YEAR FROM MAX(dates)) FROM us_spend)
),
current_month AS (
  SELECT EXTRACT(MONTH FROM MAX(dates)) AS months_elapsed
  FROM us_spend
)
SELECT ytd_spend * 12.0 / months_elapsed AS projected_annual
FROM ytd, current_month
```

---

## LAD Regression (JavaScript)

The Least Absolute Deviation regression from `fire.py:78-133` must be implemented in JavaScript since it's not available in SQL.

```typescript
// Simplified LAD regression using golden section search
function fitLAD(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;

  // Objective function: sum of absolute residuals
  function objective(slope: number): number {
    const residuals = y.map((yi, i) => yi - slope * x[i]);
    const intercept = median(residuals);
    return residuals.reduce((sum, r, i) => sum + Math.abs(y[i] - (slope * x[i] + intercept)), 0);
  }

  // Golden section search for optimal slope
  const golden = (1 + Math.sqrt(5)) / 2;
  let a = -1e6, b = 1e6;
  let c = b - (b - a) / golden;
  let d = a + (b - a) / golden;

  while (Math.abs(b - a) > 1e-6) {
    if (objective(c) < objective(d)) {
      b = d;
    } else {
      a = c;
    }
    c = b - (b - a) / golden;
    d = a + (b - a) / golden;
  }

  const slope = (a + b) / 2;
  const residuals = y.map((yi, i) => yi - slope * x[i]);
  const intercept = median(residuals);

  return { slope, intercept };
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
```

---

## Theme Port Reference

### Colors (from theme.py)

```typescript
export const COLORS = {
  // Backgrounds
  background: '#0D0D0F',
  card: '#18181B',
  cardElevated: '#1F1F23',

  // Text
  textPrimary: '#FAFAF9',
  textSecondary: '#A8A29E',
  textMuted: '#78716C',

  // Accents
  accent: '#D4A853',
  accentLight: '#E5C06E',
  accentGlow: 'rgba(212, 168, 83, 0.15)',

  // Semantic
  positive: '#6EBF8B',
  positiveBg: 'rgba(110, 191, 139, 0.12)',
  negative: '#E07A7A',
  negativeBg: 'rgba(224, 122, 122, 0.12)',

  // Charts
  chart1: '#D4A853',
  chart2: '#7BA3C9',
  chart3: '#6EBF8B',
  chart4: '#D4956A',

  // Borders
  border: '#27272A',
  borderStrong: '#3F3F46',
  divider: '#1F1F23',
};

export const FONTS = {
  display: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
  body: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

export const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@400;500;600&display=swap';
```

### Plotly Chart Template

```typescript
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
    xanchor: 'left',
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
    orientation: 'h',
    yanchor: 'bottom',
    y: 1.02,
    xanchor: 'left',
    x: 0,
  },
  margin: { t: 60, r: 24, b: 48, l: 60 },
  hoverlabel: {
    bgcolor: COLORS.cardElevated,
    font: { color: COLORS.textPrimary, family: FONTS.body },
    bordercolor: COLORS.borderStrong,
  },
};
```

---

## Excel Schema Reference

### Required Sheets

| Sheet Name | Columns | Types |
|------------|---------|-------|
| US Spend | Dates, Total, Conversion | DATE, DECIMAL, DECIMAL |
| UK Spend | Dates, Total, Conversion | DATE, DECIMAL, DECIMAL |
| US Networth | Dates, Net, Conversion | DATE, DECIMAL, DECIMAL |
| UK Networth | Dates, Net, Conversion | DATE, DECIMAL, DECIMAL |
| Total Comp | Dates, Gross, Pension Contrib, Net, Conversion | DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL |
| US Asset Allocation | Asset, Value, Account Type | VARCHAR, DECIMAL, VARCHAR |
| UK Asset Allocation | Asset, Value, Account Type, Conversion | VARCHAR, DECIMAL, VARCHAR, DECIMAL |

---

## Validation Checklist

### Summary Tab
- [ ] Current Net Worth matches Python
- [ ] YTD change matches Python
- [ ] Total Comp YTD matches Python
- [ ] Projected Spend matches Python
- [ ] Savings Rate matches Python
- [ ] FIRE Progress % matches Python
- [ ] Projected FIRE Date matches Python
- [ ] SWR chart shows correct dates
- [ ] Card expand/collapse works
- [ ] Theme colors match exactly
- [ ] Fonts render correctly

### General
- [ ] Excel upload works
- [ ] Error handling for missing sheets
- [ ] Loading states display
- [ ] Tab switching works
- [ ] Responsive on different screen sizes
