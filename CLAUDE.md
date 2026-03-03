# Personal Finance Dashboard

Personal finance tracking and retirement planning for US and UK accounts.

- **Location**: `static-site/`
- **Run**: `cd static-site && npm run dev`
- **Hosting**: GitHub Pages

## Tech Stack

- **Framework**: Svelte 5 + Vite + TypeScript
- **Data Processing**: DuckDB-WASM (SQL in browser)
- **Charts**: Plotly.js
- **Precision**: decimal.js for calculations, DuckDB `DOUBLE` for storage
- **Build**: `npm run build` outputs to `dist/`

## Code Style

- Use TypeScript strict mode
- Use `decimal.js` for all currency calculations
- SQL queries go in `src/lib/transforms/` files
- Svelte components use `.svelte` extension
- Format: `npm run format` (Prettier)

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

## Dashboard Tabs

1. **Summary**: Net worth, spending, YoY comparisons
2. **Net Worth**: Net worth over time, asset allocation
3. **Income**: Income trends
4. **Spending**: Spending patterns, savings rate
5. **FIRE**: Retirement projections and simulations

## Notes

- FIRE goal is hardcoded at $4,250,000
- Excel upload only (7 sheets) - no persistence
- LAD regression implemented in JavaScript (`static-site/src/lib/transforms/fire.ts`)
