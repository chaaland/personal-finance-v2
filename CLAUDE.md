# Personal Finance Dashboard

A Python + Dash web application for personal finance tracking and retirement planning with accounts in both the US and UK.

## Quick Start

```bash
uv run finance-dashboard
```

## Tech Stack

- **Package Manager**: `uv` for Python environment management
- **Web Framework**: Dash with Bootstrap components
- **Data Processing**: Polars (NEVER use pandas)
- **Visualization**: Plotly

## Code Style

### Formatting

- Use `black` with line length 120
- Use `isort` for import sorting
- Format command: `uv run black . && uv run isort .`

### Naming Conventions

- DataFrame variables: name them `df` or suffix with `_df` (e.g., `transactions_df`)
- Dictionary variables: name as `key_to_value` (e.g., `account_to_balance`, `date_to_transactions`)
- Polars column expressions: suffix with `_col` (e.g., `amount_col = pl.col("amount")`)
- Use `pl.Decimal` type for currency calculations

## Git Workflow

- **Branching**: Create feature branches from main: `feature/feature-name`
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code change that neither fixes a bug nor adds a feature
  - `style:` formatting, missing semicolons, etc.
  - `docs:` documentation only
  - `chore:` maintenance tasks

## Project Structure

```text
src/personal_finance/
├── app.py              # Main Dash application entry point
├── theme.py            # Visual styling and color schemes
├── components/         # UI components for each dashboard tab
│   ├── summary.py      # High-level net worth and YoY comparisons
│   ├── networth.py     # Net worth visualizations over time
│   ├── income.py       # Income visualizations over time
│   ├── spending.py     # Spending visualizations over time
│   ├── fire.py         # FIRE metrics and retirement projections
│   ├── cards.py        # Reusable card components
│   └── layout.py       # Main layout and tab structure
├── transforms/         # Data transformation logic
│   ├── networth.py     # Net worth calculations
│   ├── income.py       # Income aggregations
│   ├── spending.py     # Spending categorization
│   ├── savings.py      # Savings rate calculations
│   └── fire.py         # FIRE projections and simulations
└── data/
    └── loader.py       # Data loading utilities
```

## Dashboard Tabs

1. **Summary**: High-level metrics about net worth, spending, and year-over-year comparisons
2. **Net Worth**: Visualizations of net worth changes over time
3. **Income**: Income trends and breakdowns
4. **Spending**: Spending patterns and categorization
5. **FIRE**: Financial Independence / Retire Early metrics and projections
