# Personal Finance Dashboard

Personal finance tracking and retirement planning for US and UK accounts.

- **Location**: `static-site/`
- **Run**: `cd static-site && npm run dev` (served under the `/personal-finance-v2/` base path)
- **Hosting**: GitHub Pages

## Tech Stack

- **Framework**: Svelte 5 (runes) + Vite + TypeScript
- **Data Processing**: DuckDB-WASM (SQL in browser)
- **Charts**: Plotly.js (`plotly.js-dist-min`, typed by `@types/plotly.js-dist-min`)
- **Precision**: decimal.js for calculations, DuckDB `DOUBLE` for storage
- **Build**: `npm run build` outputs to `dist/`

## Commands

Run from `static-site/`:

- `npm run dev` / `npm run build` / `npm run preview`
- Type-check: `npx svelte-check --tsconfig ./tsconfig.json` (should report 0 errors)
- Tests: `npm test` runs Node's built-in test runner on `src/**/*.test.ts` (needs Node 22.18+). It covers only the pure modules (`projection-engine`, `projection-format`, `stores/expected-return`); there is no linter or formatter.
- Verify UI changes by running the app and loading a workbook (see "Testing with fake data").

## Code Style

- Use TypeScript strict mode
- Use `decimal.js` for all currency calculations
- SQL queries go in `src/lib/transforms/` files
- Svelte components use `.svelte` extension; shared reactive state uses runes in `.svelte.ts` files

## Git Workflow

- **Branching**: `feature/feature-name` from main
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code restructuring
  - `style:` formatting
  - `docs:` documentation
  - `chore:` maintenance

## Security & Sensitive Data

**NEVER commit or add to code:**

- API keys, tokens, or secrets
- Passwords or credentials
- Personally identifiable information (PII)
- Financial data (account numbers, balances, transactions)
- Real names, addresses, or contact information
- Any data from uploaded Excel files

Use placeholder/mock data in examples and tests. If sensitive data is accidentally staged, remove it before committing. `*.xlsx` is git-ignored.

## Project Structure

```text
static-site/src/
├── App.svelte                  # Upload → load → tabs; owns active tab state
├── main.ts
├── app.css                     # CSS variables (dark/light), global .chart-section card
└── lib/
    ├── data/
    │   ├── loader.ts           # Excel → DuckDB ingestion
    │   ├── database.ts         # DuckDB-WASM singleton, schema, query/queryDecimal helpers
    │   └── types.ts            # Result types returned by transforms
    ├── transforms/             # SQL + calculations, one file per dashboard area
    │   ├── networth.ts
    │   ├── income.ts
    │   ├── spending.ts
    │   ├── savings.ts
    │   ├── fire.ts             # Runway, progress, retirement drawdown simulation
    │   ├── projection.ts       # FIRE date: loads data from DuckDB, calls the engine
    │   ├── projection-engine.ts# Pure Monte Carlo + estimators (unit-tested)
    │   ├── projection-format.ts# Pure text for the projection (unit-tested)
    │   └── compare.ts          # compareToPrevious (current vs previous period)
    ├── components/
    │   ├── AsyncContent.svelte         # Loading / error / content wrapper for a promise
    │   ├── AssetAllocationSection.svelte
    │   ├── cards/MetricCard.svelte     # Stat card; optionally expandable
    │   ├── charts/                     # PlotlyChart.svelte + one wrapper per chart
    │   ├── tabs/                       # One component per dashboard tab
    │   └── Header, TabBar, SettingsModal, FileUpload, EmptyState, ErrorDisplay
    ├── stores/
    │   ├── settings.svelte.ts  # FIRE goal + expected real return (persisted to localStorage)
    │   ├── expected-return.ts  # Pure limits/parsing for the return setting (unit-tested)
    │   └── theme.svelte.ts     # Dark/light mode (persisted to localStorage)
    └── theme.ts                # Colors, chart template, formatters (formatCurrency, formatUsd, ...)
```

## Dashboard Tabs

1. **Summary**: Net worth, spending, YoY comparisons, FIRE progress
2. **Net Worth**: Net worth over time, asset allocation
3. **Income**: Income trends
4. **Spending**: Spending patterns, savings rate
5. **FIRE**: Retirement projections and simulations

## Patterns to Follow

- **Data flow**: Excel → `loader.ts` → DuckDB tables → `transforms/*.ts` → tab components. Tabs never write SQL.
- **Tabs**: write an async `loadData()` returning one plain object, and render it inside `<AsyncContent promise={...}>`. Use `$derived(loadData(settings.fireGoal))` when the data depends on a setting so it reloads on change.
- **Charts**: a chart component passes `title`, `empty`, and a `build({ colors, template })` function returning `{ traces, layout }` to `PlotlyChart`. `PlotlyChart` owns rendering, theme changes, the empty state, and cleanup; `xaxis`/`yaxis`/`legend` overrides merge into the theme template.
- **SQL**: US+UK spending is exposed as the `all_spend` view (`dates`, `total_usd`) created in `createTables()`. Use `queryDecimal(sql)` for a single numeric result (NULL becomes `Decimal(0)`).
- **Formatting**: `formatCurrency` is compact (`$1.2M`); `formatUsd` is whole dollars with separators (`$1,234,567`).
- **Testable logic**: keep pure logic in modules that import nothing from `$lib` aliases, runes, or the DOM, with relative imports ending in `.ts`, so `node --test` can load them. Put the test next to the module as `*.test.ts`. Write the test first and watch it fail.
- **FIRE projection**: `getFireProjection(goal, expectedRealReturn)` returns the median/10th/90th percentile dates, the assumptions used, SWR rows, and a net worth band. All tabs use it so they agree. The simulation uses plain floats on purpose; convert at the boundaries.
- **Cards**: use `MetricCard`. Pass `detailText` to make it expandable, `subtext` for a secondary line, and a string `value` to bypass currency formatting.

## Notes

- FIRE goal is a user setting (Settings modal): default $4,250,000, range $1M–$10M in $250K steps, persisted in localStorage (`stores/settings.svelte.ts`). Expected real return is the other setting: default 5%, range 2–9% in 0.5% steps.
- Excel upload only - no persistence of data. Expected sheets: `US Monthly`, `Paychecks` (required); `UK Monthly`, `US Asset Allocation`, `UK Asset Allocation` (optional). Net worth per month is `Net Override` if set, otherwise the sum of the account columns. See README for column details.
- FIRE date is a Monte Carlo of `NW' = NW(1+R) + c` in today's dollars: `c` = trailing 12 months of take-home minus spending, volatility estimated from implied monthly returns (15% default under 36 clean months, clamped to 5-30%), expected real return from Settings (default 5%). Implied returns skip months before UK balances first appear, because that step reads as a return.
- Dates in Excel are read as serial numbers (not JS Dates) so they do not shift with the browser's timezone.

## Testing with fake data

`node scripts/generate-demo-data.mjs` writes `demo-data.xlsx` (invented numbers) in the current directory; upload it through the app's Upload button to exercise every tab. Never use real financial data in tests or screenshots committed to the repo.
