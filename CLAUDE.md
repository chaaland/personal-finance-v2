# Personal Finance Dashboard

Personal finance tracking and retirement planning for US and UK accounts. Two implementations exist:

| | Python/Dash (Original) | Static Site (New) |
|---|---|---|
| **Location** | `src/personal_finance/` | `static-site/` |
| **Run** | `uv run finance-dashboard` | `cd static-site && npm run dev` |
| **Hosting** | Local server | GitHub Pages |

## Tech Stack

### Static Site (Active Development)

- **Framework**: Svelte 5 + Vite + TypeScript
- **Data Processing**: DuckDB-WASM (SQL in browser)
- **Charts**: Plotly.js
- **Precision**: decimal.js for calculations, DuckDB `DOUBLE` for storage
- **Build**: `npm run build` outputs to `dist/`

### Python/Dash (Reference)

- **Package Manager**: `uv`
- **Framework**: Dash with Bootstrap
- **Data Processing**: Polars (NEVER pandas)
- **Charts**: Plotly

## Code Style

### TypeScript/Svelte (static-site/)

- Use TypeScript strict mode
- Use `decimal.js` for all currency calculations
- SQL queries go in `src/lib/transforms/` files
- Svelte components use `.svelte` extension
- Format: `npm run format` (Prettier)

### Python (src/personal_finance/)

- Format: `uv run black . && uv run isort .` (line length 120)
- DataFrame variables: suffix with `_df` (e.g., `transactions_df`)
- Dictionary variables: `key_to_value` pattern (e.g., `account_to_balance`)
- Polars expressions: suffix with `_col` (e.g., `amount_col = pl.col("amount")`)
- Use `pl.Decimal` for currency

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

Use placeholder/mock data in examples and tests. If sensitive data is accidentally staged, remove it before committing.

## Project Structure

### Static Site

```text
static-site/
├── src/
│   ├── lib/
│   │   ├── data/
│   │   │   ├── loader.ts       # Excel → DuckDB ingestion
│   │   │   ├── database.ts     # DuckDB-WASM singleton
│   │   │   └── types.ts        # TypeScript interfaces
│   │   ├── transforms/         # SQL query functions
│   │   │   ├── networth.ts
│   │   │   ├── income.ts
│   │   │   ├── spending.ts
│   │   │   ├── savings.ts
│   │   │   └── fire.ts
│   │   ├── components/
│   │   │   ├── cards/          # MetricCard, ExpandableCard, etc.
│   │   │   ├── charts/         # Plotly chart wrappers
│   │   │   └── tabs/           # Tab components
│   │   ├── stores/data.ts      # Svelte stores
│   │   └── theme.ts            # Colors, fonts, formatters
│   ├── App.svelte
│   └── main.ts
└── package.json
```

### Python (Reference)

```text
src/personal_finance/
├── app.py              # Dash entry point
├── theme.py            # Styling (port to static-site/src/lib/theme.ts)
├── components/         # UI components (port to Svelte)
├── transforms/         # Data logic (port to SQL + TypeScript)
└── data/loader.py      # Data loading
```

## Dashboard Tabs

1. **Summary**: Net worth, spending, YoY comparisons
2. **Net Worth**: Net worth over time, asset allocation
3. **Income**: Income trends
4. **Spending**: Spending patterns, savings rate
5. **FIRE**: Retirement projections and simulations

## Migration Notes

- See `MIGRATION_PLAN.md` for detailed implementation phases
- FIRE goal is hardcoded at $4,250,000
- Excel upload only (7 sheets) - no persistence
- LAD regression implemented in JavaScript (see migration plan)
