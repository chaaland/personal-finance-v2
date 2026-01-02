# Personal Finance Dashboard Design

## Overview

A personal finance dashboard built with Dash and Polars for tracking net worth, spending, income, and savings rate over time. Dark-themed, local-first webapp with Excel file upload support.

## Tech Stack

- **Python 3.12**
- **uv** — Package manager
- **Dash** — Web framework
- **Plotly** — Charting
- **Polars** — Data manipulation (xlsx2csv engine for Excel)
- **black** (line-length 120) + **isort** — Formatting

## Project Structure

```
personal-finance-v2/
├── pyproject.toml
├── .python-version
├── src/
│   └── personal_finance/
│       ├── __init__.py
│       ├── app.py              # Dash app entry point
│       ├── data/
│       │   ├── __init__.py
│       │   └── loader.py       # Excel parsing with Polars
│       ├── transforms/
│       │   ├── __init__.py
│       │   ├── networth.py     # Net worth calculations
│       │   ├── spending.py     # Spending calculations
│       │   ├── savings.py      # Savings rate calculations
│       │   └── income.py       # Income/compensation calculations
│       ├── components/
│       │   ├── __init__.py
│       │   ├── layout.py       # Main layout with tabs
│       │   ├── summary.py      # Summary tab components
│       │   ├── networth.py     # Net worth tab components
│       │   ├── spending.py     # Spending tab components
│       │   └── income.py       # Income tab components
│       └── theme.py            # Dark mode styling
├── data/
│   └── PersonalFinance.xlsx    # Default data file
└── .gitignore
```

## Data Schema

Input file: Excel workbook with 5 sheets

### US Spend / UK Spend
| Column | Description |
|--------|-------------|
| Dates | Month end date |
| Total | Spend in local currency |
| Conversion | Exchange rate to USD |

### US Networth / UK Networth
| Column | Description |
|--------|-------------|
| Dates | Month start date |
| Net | Net worth in local currency |
| Conversion | Exchange rate to USD |

### Total Comp
| Column | Description |
|--------|-------------|
| Dates | Month start date |
| Gross | Gross pay in local currency |
| Pension Contrib | Pension contribution |
| Approx Tax Reserves | Tax withholding |
| Net | Net pay (into bank account) |
| Conversion | Exchange rate to USD |

## Data Transformations

### Net Worth
- Combine US + UK net worth sheets
- Convert to USD: `Net * Conversion`
- Aggregate by date for total net worth per month
- Calculate YTD change: current net worth - net worth at Jan 1
- Calculate YoY change: compare Dec 31 values across years

### Spending
- Combine US + UK spend sheets
- Convert to USD: `Total * Conversion`
- Aggregate by date for monthly totals
- Projected annual spend: `(YTD spend) * (12 / months_elapsed)`
- YoY comparison: projected current year vs previous full year ($ and %)

### Savings Rate
- Take-home = `Net + Pension Contrib` (converted to USD)
- Annual spend from combined spending data
- Savings rate = `(take_home - spend) / take_home`
- One value per calendar year

### Income
- Gross pay per year: sum of Gross column by year (USD)
- Net pay per year: sum of Net column by year (USD)
- YTD totals for current year

## Dashboard Layout

### Tab Structure
1. **Summary** — Key metrics at a glance
2. **Net Worth** — Wealth over time
3. **Income** — Earnings over time
4. **Spending** — Expenses and savings rate

### Summary Tab
Grid of metric cards:

| Metric | Description |
|--------|-------------|
| Current Net Worth | Latest total net worth (USD) |
| YTD Net Worth Change | $ change since Jan 1 |
| Total Comp (YTD) | Sum of Gross pay for current year (USD) |
| Projected Spend (Current Year) | Pro-rated annual spend |
| YoY Spend Change | vs previous year ($ and %) |
| Savings Rate (Current Year) | Current year's rate |

### Net Worth Tab
- **Line chart**: Net worth over time with three traces:
  - Total Net Worth (primary, prominent)
  - US Net Worth (secondary)
  - UK Net Worth (secondary)
- **Metric card**: Current net worth
- **Metric card**: YTD change ($ and %)
- **Bar chart**: YoY net worth change by year

### Income Tab
- **Grouped bar chart**: Gross vs Net pay by year (side-by-side)
- **Metric card**: Total comp YTD
- **Metric card**: Net pay YTD

### Spending Tab
- **Line chart**: Monthly spending over time (USD)
- **Metric card**: Projected spend for current year
- **Metric card**: YoY comparison ($ and %)
- **Bar chart**: Savings rate by year

## Visual Design

### Color Palette
- **Background**: Dark gray (#1a1a2e)
- **Cards**: Slightly lighter (#252540)
- **Text primary**: White (#ffffff)
- **Text secondary**: Light gray (#b0b0b0)
- **Positive accent**: Green (#00d97e)
- **Negative accent**: Red (#e63757)
- **Chart colors**: Blues, teals, purples

### Metric Cards
- Large bold number (primary value)
- Smaller label
- Secondary value (% change) colored green/red

### Charts
- Dark background matching theme
- Subtle gray gridlines
- Light gray axis labels
- Hover tooltips

## File Loading Behavior

- **On startup**: Load from `data/PersonalFinance.xlsx` if exists
- **Upload widget**: In header, allows overriding with different file
- **On upload**: All charts and metrics re-render
- **Missing file**: Show message prompting upload
- **Invalid format**: Show error indicating missing sheet/column

## Interactions

- Hover tooltips on all charts
- Zoom/pan on line charts
- Legend toggle on grouped charts
- No persistence between sessions (data in memory only)
