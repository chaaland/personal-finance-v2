# Personal Finance Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dark-themed personal finance dashboard with Dash + Polars that displays net worth, spending, income, and savings rate from an Excel file.

**Architecture:** Dash app with tabbed layout (Summary, Net Worth, Income, Spending). Data loaded from Excel via Polars, transformed into metrics and chart data, rendered with Plotly charts and styled metric cards.

**Tech Stack:** Python 3.12, uv, Dash, Plotly, Polars (xlsx2csv engine), black, isort

---

## Task 1: Project Setup

**Files:**
- Create: `pyproject.toml`
- Create: `.python-version`
- Create: `src/personal_finance/__init__.py`

**Step 1: Initialize uv project**

```bash
uv init --lib --name personal-finance
```

**Step 2: Set Python version**

Create `.python-version`:
```
3.12
```

**Step 3: Update pyproject.toml**

```toml
[project]
name = "personal-finance"
version = "0.1.0"
description = "Personal finance dashboard"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "dash>=2.18.0",
    "plotly>=5.24.0",
    "polars>=1.0.0",
    "xlsx2csv>=0.8.0",
]

[project.scripts]
finance-dashboard = "personal_finance.app:main"

[tool.black]
line-length = 120

[tool.isort]
profile = "black"
line_length = 120

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/personal_finance"]
```

**Step 4: Create package init**

Create `src/personal_finance/__init__.py`:
```python
"""Personal finance dashboard."""
```

**Step 5: Install dependencies**

```bash
uv sync
```

**Step 6: Commit**

```bash
git add pyproject.toml .python-version src/
git commit -m "feat: initialize project with uv and dependencies"
```

---

## Task 2: Theme Module

**Files:**
- Create: `src/personal_finance/theme.py`

**Step 1: Create theme constants and styles**

```python
"""Dark theme styling for the dashboard."""

# Color palette
COLORS = {
    "background": "#1a1a2e",
    "card": "#252540",
    "text_primary": "#ffffff",
    "text_secondary": "#b0b0b0",
    "positive": "#00d97e",
    "negative": "#e63757",
    "chart_1": "#6366f1",  # Indigo
    "chart_2": "#06b6d4",  # Cyan
    "chart_3": "#8b5cf6",  # Purple
    "chart_4": "#14b8a6",  # Teal
}

# Plotly chart template
CHART_TEMPLATE = {
    "layout": {
        "paper_bgcolor": COLORS["background"],
        "plot_bgcolor": COLORS["background"],
        "font": {"color": COLORS["text_primary"]},
        "xaxis": {
            "gridcolor": "#3a3a5a",
            "linecolor": "#3a3a5a",
        },
        "yaxis": {
            "gridcolor": "#3a3a5a",
            "linecolor": "#3a3a5a",
        },
        "legend": {
            "bgcolor": "rgba(0,0,0,0)",
            "font": {"color": COLORS["text_secondary"]},
        },
    }
}

# CSS styles
STYLES = {
    "page": {
        "backgroundColor": COLORS["background"],
        "minHeight": "100vh",
        "padding": "20px",
        "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    "card": {
        "backgroundColor": COLORS["card"],
        "borderRadius": "12px",
        "padding": "24px",
        "marginBottom": "16px",
    },
    "metric_value": {
        "fontSize": "32px",
        "fontWeight": "bold",
        "color": COLORS["text_primary"],
        "margin": "0",
    },
    "metric_label": {
        "fontSize": "14px",
        "color": COLORS["text_secondary"],
        "marginBottom": "8px",
    },
    "metric_change_positive": {
        "fontSize": "14px",
        "color": COLORS["positive"],
        "marginTop": "4px",
    },
    "metric_change_negative": {
        "fontSize": "14px",
        "color": COLORS["negative"],
        "marginTop": "4px",
    },
    "tab": {
        "backgroundColor": COLORS["card"],
        "color": COLORS["text_secondary"],
        "border": "none",
        "borderRadius": "8px 8px 0 0",
        "padding": "12px 24px",
    },
    "tab_selected": {
        "backgroundColor": COLORS["background"],
        "color": COLORS["text_primary"],
        "border": "none",
        "borderRadius": "8px 8px 0 0",
        "padding": "12px 24px",
        "borderBottom": f"2px solid {COLORS['chart_1']}",
    },
    "header": {
        "display": "flex",
        "justifyContent": "space-between",
        "alignItems": "center",
        "marginBottom": "24px",
    },
    "title": {
        "fontSize": "28px",
        "fontWeight": "bold",
        "color": COLORS["text_primary"],
        "margin": "0",
    },
    "grid": {
        "display": "grid",
        "gridTemplateColumns": "repeat(auto-fit, minmax(250px, 1fr))",
        "gap": "16px",
        "marginBottom": "24px",
    },
    "chart_container": {
        "backgroundColor": COLORS["card"],
        "borderRadius": "12px",
        "padding": "16px",
        "marginBottom": "16px",
    },
}


def format_currency(value: float) -> str:
    """Format a number as USD currency."""
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:,.2f}M"
    elif abs(value) >= 1_000:
        return f"${value / 1_000:,.1f}K"
    else:
        return f"${value:,.0f}"


def format_percentage(value: float) -> str:
    """Format a number as a percentage."""
    return f"{value:+.1f}%"


def format_change(value: float, is_percentage: bool = False) -> tuple[str, dict]:
    """Format a change value with appropriate styling."""
    if is_percentage:
        text = format_percentage(value)
    else:
        sign = "+" if value >= 0 else ""
        text = f"{sign}{format_currency(value)}"

    style = STYLES["metric_change_positive"] if value >= 0 else STYLES["metric_change_negative"]
    return text, style
```

**Step 2: Run formatters**

```bash
uv run black src/personal_finance/theme.py
uv run isort src/personal_finance/theme.py
```

**Step 3: Commit**

```bash
git add src/personal_finance/theme.py
git commit -m "feat: add dark theme styling and formatters"
```

---

## Task 3: Data Loader

**Files:**
- Create: `src/personal_finance/data/__init__.py`
- Create: `src/personal_finance/data/loader.py`

**Step 1: Create data package init**

Create `src/personal_finance/data/__init__.py`:
```python
"""Data loading and parsing."""

from personal_finance.data.loader import FinanceData, load_excel

__all__ = ["FinanceData", "load_excel"]
```

**Step 2: Create loader module**

```python
"""Excel file loading with Polars."""

from dataclasses import dataclass
from pathlib import Path

import polars as pl


@dataclass
class FinanceData:
    """Container for all loaded finance data."""

    us_spend: pl.DataFrame
    uk_spend: pl.DataFrame
    us_networth: pl.DataFrame
    uk_networth: pl.DataFrame
    total_comp: pl.DataFrame


def load_excel(file_path: str | Path) -> FinanceData:
    """Load finance data from Excel file.

    Args:
        file_path: Path to the Excel file.

    Returns:
        FinanceData containing all sheets as DataFrames.

    Raises:
        FileNotFoundError: If file doesn't exist.
        ValueError: If required sheets are missing.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    required_sheets = ["US Spend", "UK Spend", "US Networth", "UK Networth", "Total Comp"]

    try:
        us_spend = pl.read_excel(path, sheet_name="US Spend", engine="xlsx2csv")
        uk_spend = pl.read_excel(path, sheet_name="UK Spend", engine="xlsx2csv")
        us_networth = pl.read_excel(path, sheet_name="US Networth", engine="xlsx2csv")
        uk_networth = pl.read_excel(path, sheet_name="UK Networth", engine="xlsx2csv")
        total_comp = pl.read_excel(path, sheet_name="Total Comp", engine="xlsx2csv")
    except Exception as e:
        raise ValueError(f"Error reading Excel file. Ensure sheets exist: {required_sheets}. Error: {e}")

    # Normalize column names and ensure date column is datetime
    us_spend = _normalize_df(us_spend, ["Dates", "Total", "Conversion"])
    uk_spend = _normalize_df(uk_spend, ["Dates", "Total", "Conversion"])
    us_networth = _normalize_df(us_networth, ["Dates", "Net", "Conversion"])
    uk_networth = _normalize_df(uk_networth, ["Dates", "Net", "Conversion"])
    total_comp = _normalize_df(total_comp, ["Dates", "Gross", "Pension Contrib", "Net", "Conversion"])

    return FinanceData(
        us_spend=us_spend,
        uk_spend=uk_spend,
        us_networth=us_networth,
        uk_networth=uk_networth,
        total_comp=total_comp,
    )


def _normalize_df(df: pl.DataFrame, required_columns: list[str]) -> pl.DataFrame:
    """Normalize DataFrame: check columns, parse dates, drop nulls."""
    # Check required columns exist
    missing = set(required_columns) - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Select only required columns
    df = df.select(required_columns)

    # Ensure Dates is datetime
    if df["Dates"].dtype != pl.Datetime:
        df = df.with_columns(pl.col("Dates").cast(pl.Datetime))

    # Drop rows with null dates
    df = df.drop_nulls(subset=["Dates"])

    return df


def load_excel_from_bytes(content: bytes) -> FinanceData:
    """Load finance data from uploaded file bytes.

    Args:
        content: Raw bytes of the Excel file.

    Returns:
        FinanceData containing all sheets as DataFrames.
    """
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        tmp.write(content)
        tmp.flush()
        return load_excel(tmp.name)
```

**Step 3: Run formatters**

```bash
uv run black src/personal_finance/data/
uv run isort src/personal_finance/data/
```

**Step 4: Commit**

```bash
git add src/personal_finance/data/
git commit -m "feat: add Excel data loader with Polars"
```

---

## Task 4: Net Worth Transforms

**Files:**
- Create: `src/personal_finance/transforms/__init__.py`
- Create: `src/personal_finance/transforms/networth.py`

**Step 1: Create transforms package init**

Create `src/personal_finance/transforms/__init__.py`:
```python
"""Data transformation functions."""
```

**Step 2: Create networth transforms**

```python
"""Net worth calculations and transformations."""

from datetime import datetime

import polars as pl

from personal_finance.data.loader import FinanceData


def get_combined_networth(data: FinanceData) -> pl.DataFrame:
    """Combine US and UK net worth into single DataFrame with USD values.

    Returns DataFrame with columns: Dates, US_USD, UK_USD, Total_USD
    """
    us = data.us_networth.select(
        pl.col("Dates"),
        (pl.col("Net") * pl.col("Conversion")).alias("US_USD"),
    )

    uk = data.uk_networth.select(
        pl.col("Dates"),
        (pl.col("Net") * pl.col("Conversion")).alias("UK_USD"),
    )

    # Join on dates, filling missing values with 0
    combined = us.join(uk, on="Dates", how="outer_coalesce").with_columns(
        pl.col("US_USD").fill_null(0),
        pl.col("UK_USD").fill_null(0),
    )

    # Calculate total
    combined = combined.with_columns((pl.col("US_USD") + pl.col("UK_USD")).alias("Total_USD"))

    return combined.sort("Dates")


def get_current_networth(data: FinanceData) -> float:
    """Get the most recent total net worth in USD."""
    combined = get_combined_networth(data)
    return combined.select("Total_USD").row(-1)[0]


def get_ytd_networth_change(data: FinanceData) -> tuple[float, float]:
    """Get year-to-date net worth change.

    Returns:
        Tuple of (absolute_change, percentage_change)
    """
    combined = get_combined_networth(data)
    current_year = datetime.now().year

    # Get first value of current year
    year_start = combined.filter(pl.col("Dates").dt.year() == current_year).sort("Dates")

    if year_start.is_empty():
        return 0.0, 0.0

    start_value = year_start.select("Total_USD").row(0)[0]
    current_value = combined.select("Total_USD").row(-1)[0]

    absolute_change = current_value - start_value
    percentage_change = (absolute_change / start_value) * 100 if start_value != 0 else 0.0

    return absolute_change, percentage_change


def get_yoy_networth_changes(data: FinanceData) -> pl.DataFrame:
    """Get year-over-year net worth changes.

    Returns DataFrame with columns: Year, Start_Value, End_Value, Change, Change_Pct
    """
    combined = get_combined_networth(data)

    # Add year column
    combined = combined.with_columns(pl.col("Dates").dt.year().alias("Year"))

    # Get first and last value per year
    yearly = combined.group_by("Year").agg(
        pl.col("Total_USD").first().alias("Start_Value"),
        pl.col("Total_USD").last().alias("End_Value"),
    )

    yearly = yearly.with_columns(
        (pl.col("End_Value") - pl.col("Start_Value")).alias("Change"),
        ((pl.col("End_Value") - pl.col("Start_Value")) / pl.col("Start_Value") * 100).alias("Change_Pct"),
    )

    return yearly.sort("Year")
```

**Step 3: Run formatters**

```bash
uv run black src/personal_finance/transforms/
uv run isort src/personal_finance/transforms/
```

**Step 4: Commit**

```bash
git add src/personal_finance/transforms/
git commit -m "feat: add net worth transformation functions"
```

---

## Task 5: Spending Transforms

**Files:**
- Create: `src/personal_finance/transforms/spending.py`

**Step 1: Create spending transforms**

```python
"""Spending calculations and transformations."""

from datetime import datetime

import polars as pl

from personal_finance.data.loader import FinanceData


def get_combined_spending(data: FinanceData) -> pl.DataFrame:
    """Combine US and UK spending into single DataFrame with USD values.

    Returns DataFrame with columns: Dates, Total_USD
    """
    us = data.us_spend.select(
        pl.col("Dates"),
        (pl.col("Total") * pl.col("Conversion")).alias("USD"),
    )

    uk = data.uk_spend.select(
        pl.col("Dates"),
        (pl.col("Total") * pl.col("Conversion")).alias("USD"),
    )

    # Concatenate and aggregate by date
    combined = pl.concat([us, uk]).group_by("Dates").agg(pl.col("USD").sum().alias("Total_USD"))

    return combined.sort("Dates")


def get_monthly_spending(data: FinanceData) -> pl.DataFrame:
    """Get monthly spending totals in USD."""
    return get_combined_spending(data)


def get_ytd_spending(data: FinanceData) -> float:
    """Get year-to-date spending total in USD."""
    combined = get_combined_spending(data)
    current_year = datetime.now().year

    ytd = combined.filter(pl.col("Dates").dt.year() == current_year)
    return ytd.select(pl.col("Total_USD").sum()).row(0)[0] or 0.0


def get_projected_annual_spend(data: FinanceData) -> float:
    """Get projected annual spend based on YTD spending.

    Formula: (YTD spend) * (12 / months_elapsed)
    """
    current_date = datetime.now()
    months_elapsed = current_date.month

    ytd_spend = get_ytd_spending(data)

    if months_elapsed == 0:
        return 0.0

    return ytd_spend * (12 / months_elapsed)


def get_previous_year_spending(data: FinanceData) -> float:
    """Get total spending for the previous full year."""
    combined = get_combined_spending(data)
    previous_year = datetime.now().year - 1

    prev_year_data = combined.filter(pl.col("Dates").dt.year() == previous_year)
    return prev_year_data.select(pl.col("Total_USD").sum()).row(0)[0] or 0.0


def get_yoy_spending_comparison(data: FinanceData) -> tuple[float, float]:
    """Compare projected current year spend to previous year.

    Returns:
        Tuple of (absolute_difference, percentage_difference)
    """
    projected = get_projected_annual_spend(data)
    previous = get_previous_year_spending(data)

    if previous == 0:
        return projected, 0.0

    absolute_diff = projected - previous
    percentage_diff = (absolute_diff / previous) * 100

    return absolute_diff, percentage_diff
```

**Step 2: Run formatters**

```bash
uv run black src/personal_finance/transforms/spending.py
uv run isort src/personal_finance/transforms/spending.py
```

**Step 3: Commit**

```bash
git add src/personal_finance/transforms/spending.py
git commit -m "feat: add spending transformation functions"
```

---

## Task 6: Income Transforms

**Files:**
- Create: `src/personal_finance/transforms/income.py`

**Step 1: Create income transforms**

```python
"""Income/compensation calculations and transformations."""

from datetime import datetime

import polars as pl

from personal_finance.data.loader import FinanceData


def get_income_by_year(data: FinanceData) -> pl.DataFrame:
    """Get gross and net income per year in USD.

    Returns DataFrame with columns: Year, Gross_USD, Net_USD
    """
    comp = data.total_comp.with_columns(
        pl.col("Dates").dt.year().alias("Year"),
        (pl.col("Gross") * pl.col("Conversion")).alias("Gross_USD"),
        (pl.col("Net") * pl.col("Conversion")).alias("Net_USD"),
    )

    yearly = comp.group_by("Year").agg(
        pl.col("Gross_USD").sum().alias("Gross_USD"),
        pl.col("Net_USD").sum().alias("Net_USD"),
    )

    return yearly.sort("Year")


def get_ytd_gross_income(data: FinanceData) -> float:
    """Get year-to-date gross income in USD."""
    current_year = datetime.now().year

    ytd = data.total_comp.filter(pl.col("Dates").dt.year() == current_year)

    if ytd.is_empty():
        return 0.0

    return ytd.select((pl.col("Gross") * pl.col("Conversion")).sum()).row(0)[0] or 0.0


def get_ytd_net_income(data: FinanceData) -> float:
    """Get year-to-date net income in USD."""
    current_year = datetime.now().year

    ytd = data.total_comp.filter(pl.col("Dates").dt.year() == current_year)

    if ytd.is_empty():
        return 0.0

    return ytd.select((pl.col("Net") * pl.col("Conversion")).sum()).row(0)[0] or 0.0


def get_take_home_by_year(data: FinanceData) -> pl.DataFrame:
    """Get take-home pay (Net + Pension Contrib) per year in USD.

    Returns DataFrame with columns: Year, Take_Home_USD
    """
    comp = data.total_comp.with_columns(
        pl.col("Dates").dt.year().alias("Year"),
        ((pl.col("Net") + pl.col("Pension Contrib")) * pl.col("Conversion")).alias("Take_Home_USD"),
    )

    yearly = comp.group_by("Year").agg(pl.col("Take_Home_USD").sum().alias("Take_Home_USD"))

    return yearly.sort("Year")
```

**Step 2: Run formatters**

```bash
uv run black src/personal_finance/transforms/income.py
uv run isort src/personal_finance/transforms/income.py
```

**Step 3: Commit**

```bash
git add src/personal_finance/transforms/income.py
git commit -m "feat: add income transformation functions"
```

---

## Task 7: Savings Rate Transforms

**Files:**
- Create: `src/personal_finance/transforms/savings.py`

**Step 1: Create savings transforms**

```python
"""Savings rate calculations."""

from datetime import datetime

import polars as pl

from personal_finance.data.loader import FinanceData
from personal_finance.transforms.income import get_take_home_by_year
from personal_finance.transforms.spending import get_combined_spending


def get_annual_spending(data: FinanceData) -> pl.DataFrame:
    """Get total spending per year.

    Returns DataFrame with columns: Year, Spend_USD
    """
    combined = get_combined_spending(data)

    yearly = combined.with_columns(pl.col("Dates").dt.year().alias("Year")).group_by("Year").agg(
        pl.col("Total_USD").sum().alias("Spend_USD")
    )

    return yearly.sort("Year")


def get_savings_rate_by_year(data: FinanceData) -> pl.DataFrame:
    """Calculate savings rate per year.

    Formula: (take_home - spend) / take_home

    Returns DataFrame with columns: Year, Savings_Rate
    """
    take_home = get_take_home_by_year(data)
    spending = get_annual_spending(data)

    # Join on year
    combined = take_home.join(spending, on="Year", how="left").with_columns(pl.col("Spend_USD").fill_null(0))

    # Calculate savings rate
    combined = combined.with_columns(
        ((pl.col("Take_Home_USD") - pl.col("Spend_USD")) / pl.col("Take_Home_USD") * 100).alias("Savings_Rate")
    )

    return combined.select("Year", "Savings_Rate").sort("Year")


def get_current_year_savings_rate(data: FinanceData) -> float:
    """Get savings rate for the current year so far."""
    current_year = datetime.now().year

    rates = get_savings_rate_by_year(data)
    current = rates.filter(pl.col("Year") == current_year)

    if current.is_empty():
        return 0.0

    return current.select("Savings_Rate").row(0)[0] or 0.0
```

**Step 2: Update transforms __init__**

```python
"""Data transformation functions."""

from personal_finance.transforms.income import (
    get_income_by_year,
    get_take_home_by_year,
    get_ytd_gross_income,
    get_ytd_net_income,
)
from personal_finance.transforms.networth import (
    get_combined_networth,
    get_current_networth,
    get_yoy_networth_changes,
    get_ytd_networth_change,
)
from personal_finance.transforms.savings import (
    get_current_year_savings_rate,
    get_savings_rate_by_year,
)
from personal_finance.transforms.spending import (
    get_monthly_spending,
    get_previous_year_spending,
    get_projected_annual_spend,
    get_yoy_spending_comparison,
    get_ytd_spending,
)

__all__ = [
    "get_combined_networth",
    "get_current_networth",
    "get_ytd_networth_change",
    "get_yoy_networth_changes",
    "get_monthly_spending",
    "get_ytd_spending",
    "get_projected_annual_spend",
    "get_previous_year_spending",
    "get_yoy_spending_comparison",
    "get_income_by_year",
    "get_ytd_gross_income",
    "get_ytd_net_income",
    "get_take_home_by_year",
    "get_savings_rate_by_year",
    "get_current_year_savings_rate",
]
```

**Step 3: Run formatters**

```bash
uv run black src/personal_finance/transforms/
uv run isort src/personal_finance/transforms/
```

**Step 4: Commit**

```bash
git add src/personal_finance/transforms/
git commit -m "feat: add savings rate calculations"
```

---

## Task 8: Metric Card Component

**Files:**
- Create: `src/personal_finance/components/__init__.py`
- Create: `src/personal_finance/components/cards.py`

**Step 1: Create components package init**

Create `src/personal_finance/components/__init__.py`:
```python
"""Dashboard UI components."""
```

**Step 2: Create metric card component**

```python
"""Reusable metric card components."""

from dash import html

from personal_finance.theme import STYLES, format_change, format_currency, format_percentage


def metric_card(
    label: str,
    value: float,
    change: float | None = None,
    change_is_percentage: bool = False,
    value_is_percentage: bool = False,
) -> html.Div:
    """Create a styled metric card.

    Args:
        label: Card title/label
        value: Primary value to display
        change: Optional change value (shown below primary)
        change_is_percentage: If True, format change as percentage
        value_is_percentage: If True, format value as percentage

    Returns:
        Dash HTML component for the card
    """
    if value_is_percentage:
        formatted_value = format_percentage(value).replace("+", "")
    else:
        formatted_value = format_currency(value)

    children = [
        html.P(label, style=STYLES["metric_label"]),
        html.P(formatted_value, style=STYLES["metric_value"]),
    ]

    if change is not None:
        change_text, change_style = format_change(change, is_percentage=change_is_percentage)
        children.append(html.P(change_text, style=change_style))

    return html.Div(children=children, style=STYLES["card"])
```

**Step 3: Run formatters**

```bash
uv run black src/personal_finance/components/
uv run isort src/personal_finance/components/
```

**Step 4: Commit**

```bash
git add src/personal_finance/components/
git commit -m "feat: add reusable metric card component"
```

---

## Task 9: Summary Tab Component

**Files:**
- Create: `src/personal_finance/components/summary.py`

**Step 1: Create summary tab**

```python
"""Summary tab component."""

from dash import html

from personal_finance.components.cards import metric_card
from personal_finance.data.loader import FinanceData
from personal_finance.theme import STYLES
from personal_finance.transforms import (
    get_current_networth,
    get_current_year_savings_rate,
    get_projected_annual_spend,
    get_yoy_spending_comparison,
    get_ytd_gross_income,
    get_ytd_networth_change,
)


def create_summary_tab(data: FinanceData) -> html.Div:
    """Create the summary tab content with key metrics."""
    # Calculate all metrics
    current_networth = get_current_networth(data)
    ytd_nw_change, ytd_nw_pct = get_ytd_networth_change(data)
    ytd_gross = get_ytd_gross_income(data)
    projected_spend = get_projected_annual_spend(data)
    yoy_spend_diff, yoy_spend_pct = get_yoy_spending_comparison(data)
    savings_rate = get_current_year_savings_rate(data)

    return html.Div(
        style=STYLES["grid"],
        children=[
            metric_card(
                label="Current Net Worth",
                value=current_networth,
                change=ytd_nw_pct,
                change_is_percentage=True,
            ),
            metric_card(
                label="YTD Net Worth Change",
                value=ytd_nw_change,
            ),
            metric_card(
                label="Total Comp (YTD)",
                value=ytd_gross,
            ),
            metric_card(
                label="Projected Spend (This Year)",
                value=projected_spend,
                change=yoy_spend_pct,
                change_is_percentage=True,
            ),
            metric_card(
                label="YoY Spend Change",
                value=yoy_spend_diff,
            ),
            metric_card(
                label="Savings Rate (This Year)",
                value=savings_rate,
                value_is_percentage=True,
            ),
        ],
    )
```

**Step 2: Run formatters**

```bash
uv run black src/personal_finance/components/summary.py
uv run isort src/personal_finance/components/summary.py
```

**Step 3: Commit**

```bash
git add src/personal_finance/components/summary.py
git commit -m "feat: add summary tab with key metrics"
```

---

## Task 10: Net Worth Tab Component

**Files:**
- Create: `src/personal_finance/components/networth.py`

**Step 1: Create net worth tab**

```python
"""Net worth tab component."""

from dash import dcc, html
import plotly.graph_objects as go

from personal_finance.components.cards import metric_card
from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, STYLES
from personal_finance.transforms import (
    get_combined_networth,
    get_current_networth,
    get_yoy_networth_changes,
    get_ytd_networth_change,
)


def create_networth_chart(data: FinanceData) -> go.Figure:
    """Create net worth over time line chart."""
    df = get_combined_networth(data)

    fig = go.Figure()

    # Total net worth (primary)
    fig.add_trace(
        go.Scatter(
            x=df["Dates"].to_list(),
            y=df["Total_USD"].to_list(),
            name="Total",
            line={"color": COLORS["chart_1"], "width": 3},
            mode="lines",
        )
    )

    # US net worth (secondary)
    fig.add_trace(
        go.Scatter(
            x=df["Dates"].to_list(),
            y=df["US_USD"].to_list(),
            name="US",
            line={"color": COLORS["chart_2"], "width": 2},
            mode="lines",
        )
    )

    # UK net worth (secondary)
    fig.add_trace(
        go.Scatter(
            x=df["Dates"].to_list(),
            y=df["UK_USD"].to_list(),
            name="UK",
            line={"color": COLORS["chart_3"], "width": 2},
            mode="lines",
        )
    )

    fig.update_layout(
        title="Net Worth Over Time",
        xaxis_title="Date",
        yaxis_title="USD",
        template=CHART_TEMPLATE,
        hovermode="x unified",
        legend={"orientation": "h", "yanchor": "bottom", "y": 1.02, "xanchor": "right", "x": 1},
    )

    return fig


def create_yoy_networth_chart(data: FinanceData) -> go.Figure:
    """Create year-over-year net worth change bar chart."""
    df = get_yoy_networth_changes(data)

    colors = [COLORS["positive"] if c >= 0 else COLORS["negative"] for c in df["Change"].to_list()]

    fig = go.Figure(
        go.Bar(
            x=df["Year"].to_list(),
            y=df["Change"].to_list(),
            marker_color=colors,
            text=[f"{c / 1000:.0f}K" for c in df["Change"].to_list()],
            textposition="outside",
        )
    )

    fig.update_layout(
        title="Year-over-Year Net Worth Change",
        xaxis_title="Year",
        yaxis_title="USD",
        template=CHART_TEMPLATE,
    )

    return fig


def create_networth_tab(data: FinanceData) -> html.Div:
    """Create the net worth tab content."""
    current_nw = get_current_networth(data)
    ytd_change, ytd_pct = get_ytd_networth_change(data)

    return html.Div(
        children=[
            # Metrics row
            html.Div(
                style={**STYLES["grid"], "gridTemplateColumns": "repeat(2, 1fr)"},
                children=[
                    metric_card(
                        label="Current Net Worth",
                        value=current_nw,
                    ),
                    metric_card(
                        label="YTD Change",
                        value=ytd_change,
                        change=ytd_pct,
                        change_is_percentage=True,
                    ),
                ],
            ),
            # Net worth over time chart
            html.Div(
                style=STYLES["chart_container"],
                children=[dcc.Graph(figure=create_networth_chart(data), config={"displayModeBar": False})],
            ),
            # YoY change chart
            html.Div(
                style=STYLES["chart_container"],
                children=[dcc.Graph(figure=create_yoy_networth_chart(data), config={"displayModeBar": False})],
            ),
        ]
    )
```

**Step 2: Run formatters**

```bash
uv run black src/personal_finance/components/networth.py
uv run isort src/personal_finance/components/networth.py
```

**Step 3: Commit**

```bash
git add src/personal_finance/components/networth.py
git commit -m "feat: add net worth tab with charts"
```

---

## Task 11: Income Tab Component

**Files:**
- Create: `src/personal_finance/components/income.py`

**Step 1: Create income tab**

```python
"""Income tab component."""

from dash import dcc, html
import plotly.graph_objects as go

from personal_finance.components.cards import metric_card
from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, STYLES
from personal_finance.transforms import (
    get_income_by_year,
    get_ytd_gross_income,
    get_ytd_net_income,
)


def create_income_chart(data: FinanceData) -> go.Figure:
    """Create grouped bar chart of gross vs net income by year."""
    df = get_income_by_year(data)

    fig = go.Figure()

    # Gross income bars
    fig.add_trace(
        go.Bar(
            x=df["Year"].to_list(),
            y=df["Gross_USD"].to_list(),
            name="Gross",
            marker_color=COLORS["chart_1"],
        )
    )

    # Net income bars
    fig.add_trace(
        go.Bar(
            x=df["Year"].to_list(),
            y=df["Net_USD"].to_list(),
            name="Net",
            marker_color=COLORS["chart_2"],
        )
    )

    fig.update_layout(
        title="Annual Income: Gross vs Net",
        xaxis_title="Year",
        yaxis_title="USD",
        template=CHART_TEMPLATE,
        barmode="group",
        legend={"orientation": "h", "yanchor": "bottom", "y": 1.02, "xanchor": "right", "x": 1},
    )

    return fig


def create_income_tab(data: FinanceData) -> html.Div:
    """Create the income tab content."""
    ytd_gross = get_ytd_gross_income(data)
    ytd_net = get_ytd_net_income(data)

    return html.Div(
        children=[
            # Metrics row
            html.Div(
                style={**STYLES["grid"], "gridTemplateColumns": "repeat(2, 1fr)"},
                children=[
                    metric_card(
                        label="Total Comp (YTD)",
                        value=ytd_gross,
                    ),
                    metric_card(
                        label="Net Pay (YTD)",
                        value=ytd_net,
                    ),
                ],
            ),
            # Income chart
            html.Div(
                style=STYLES["chart_container"],
                children=[dcc.Graph(figure=create_income_chart(data), config={"displayModeBar": False})],
            ),
        ]
    )
```

**Step 2: Run formatters**

```bash
uv run black src/personal_finance/components/income.py
uv run isort src/personal_finance/components/income.py
```

**Step 3: Commit**

```bash
git add src/personal_finance/components/income.py
git commit -m "feat: add income tab with gross vs net chart"
```

---

## Task 12: Spending Tab Component

**Files:**
- Create: `src/personal_finance/components/spending.py`

**Step 1: Create spending tab**

```python
"""Spending tab component."""

from dash import dcc, html
import plotly.graph_objects as go

from personal_finance.components.cards import metric_card
from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, STYLES
from personal_finance.transforms import (
    get_monthly_spending,
    get_projected_annual_spend,
    get_savings_rate_by_year,
    get_yoy_spending_comparison,
)


def create_spending_chart(data: FinanceData) -> go.Figure:
    """Create monthly spending line chart."""
    df = get_monthly_spending(data)

    fig = go.Figure(
        go.Scatter(
            x=df["Dates"].to_list(),
            y=df["Total_USD"].to_list(),
            mode="lines",
            line={"color": COLORS["chart_1"], "width": 2},
            fill="tozeroy",
            fillcolor=f"rgba(99, 102, 241, 0.2)",
        )
    )

    fig.update_layout(
        title="Monthly Spending",
        xaxis_title="Date",
        yaxis_title="USD",
        template=CHART_TEMPLATE,
    )

    return fig


def create_savings_rate_chart(data: FinanceData) -> go.Figure:
    """Create savings rate by year bar chart."""
    df = get_savings_rate_by_year(data)

    colors = [COLORS["positive"] if r >= 0 else COLORS["negative"] for r in df["Savings_Rate"].to_list()]

    fig = go.Figure(
        go.Bar(
            x=df["Year"].to_list(),
            y=df["Savings_Rate"].to_list(),
            marker_color=colors,
            text=[f"{r:.1f}%" for r in df["Savings_Rate"].to_list()],
            textposition="outside",
        )
    )

    fig.update_layout(
        title="Savings Rate by Year",
        xaxis_title="Year",
        yaxis_title="Savings Rate (%)",
        template=CHART_TEMPLATE,
    )

    return fig


def create_spending_tab(data: FinanceData) -> html.Div:
    """Create the spending tab content."""
    projected_spend = get_projected_annual_spend(data)
    yoy_diff, yoy_pct = get_yoy_spending_comparison(data)

    return html.Div(
        children=[
            # Metrics row
            html.Div(
                style={**STYLES["grid"], "gridTemplateColumns": "repeat(2, 1fr)"},
                children=[
                    metric_card(
                        label="Projected Spend (This Year)",
                        value=projected_spend,
                    ),
                    metric_card(
                        label="YoY Change",
                        value=yoy_diff,
                        change=yoy_pct,
                        change_is_percentage=True,
                    ),
                ],
            ),
            # Spending chart
            html.Div(
                style=STYLES["chart_container"],
                children=[dcc.Graph(figure=create_spending_chart(data), config={"displayModeBar": False})],
            ),
            # Savings rate chart
            html.Div(
                style=STYLES["chart_container"],
                children=[dcc.Graph(figure=create_savings_rate_chart(data), config={"displayModeBar": False})],
            ),
        ]
    )
```

**Step 2: Run formatters**

```bash
uv run black src/personal_finance/components/spending.py
uv run isort src/personal_finance/components/spending.py
```

**Step 3: Commit**

```bash
git add src/personal_finance/components/spending.py
git commit -m "feat: add spending tab with charts"
```

---

## Task 13: Main Layout Component

**Files:**
- Create: `src/personal_finance/components/layout.py`

**Step 1: Create main layout**

```python
"""Main dashboard layout."""

from dash import dcc, html

from personal_finance.components.income import create_income_tab
from personal_finance.components.networth import create_networth_tab
from personal_finance.components.spending import create_spending_tab
from personal_finance.components.summary import create_summary_tab
from personal_finance.data.loader import FinanceData
from personal_finance.theme import COLORS, STYLES


def create_header() -> html.Div:
    """Create the dashboard header with title and upload."""
    return html.Div(
        style=STYLES["header"],
        children=[
            html.H1("Personal Finance Dashboard", style=STYLES["title"]),
            dcc.Upload(
                id="file-upload",
                children=html.Div(
                    [
                        html.Span("Upload Excel File", style={"marginRight": "8px"}),
                        html.Span("📁"),
                    ]
                ),
                style={
                    "padding": "10px 20px",
                    "backgroundColor": COLORS["card"],
                    "borderRadius": "8px",
                    "cursor": "pointer",
                    "color": COLORS["text_secondary"],
                },
            ),
        ],
    )


def create_tabs(data: FinanceData) -> dcc.Tabs:
    """Create the tabbed interface."""
    return dcc.Tabs(
        id="tabs",
        value="summary",
        children=[
            dcc.Tab(
                label="Summary",
                value="summary",
                style=STYLES["tab"],
                selected_style=STYLES["tab_selected"],
                children=create_summary_tab(data),
            ),
            dcc.Tab(
                label="Net Worth",
                value="networth",
                style=STYLES["tab"],
                selected_style=STYLES["tab_selected"],
                children=create_networth_tab(data),
            ),
            dcc.Tab(
                label="Income",
                value="income",
                style=STYLES["tab"],
                selected_style=STYLES["tab_selected"],
                children=create_income_tab(data),
            ),
            dcc.Tab(
                label="Spending",
                value="spending",
                style=STYLES["tab"],
                selected_style=STYLES["tab_selected"],
                children=create_spending_tab(data),
            ),
        ],
    )


def create_layout(data: FinanceData | None) -> html.Div:
    """Create the main dashboard layout."""
    if data is None:
        return html.Div(
            style=STYLES["page"],
            children=[
                create_header(),
                html.Div(
                    style={
                        **STYLES["card"],
                        "textAlign": "center",
                        "padding": "60px",
                    },
                    children=[
                        html.H2(
                            "No Data Loaded",
                            style={"color": COLORS["text_primary"], "marginBottom": "16px"},
                        ),
                        html.P(
                            "Upload an Excel file or place PersonalFinance.xlsx in the data/ folder.",
                            style={"color": COLORS["text_secondary"]},
                        ),
                    ],
                ),
            ],
        )

    return html.Div(
        style=STYLES["page"],
        children=[
            create_header(),
            create_tabs(data),
        ],
    )
```

**Step 2: Update components __init__**

```python
"""Dashboard UI components."""

from personal_finance.components.cards import metric_card
from personal_finance.components.layout import create_layout

__all__ = ["metric_card", "create_layout"]
```

**Step 3: Run formatters**

```bash
uv run black src/personal_finance/components/
uv run isort src/personal_finance/components/
```

**Step 4: Commit**

```bash
git add src/personal_finance/components/
git commit -m "feat: add main layout with tabs and header"
```

---

## Task 14: Main App Entry Point

**Files:**
- Create: `src/personal_finance/app.py`

**Step 1: Create the Dash app**

```python
"""Dash application entry point."""

import base64
from pathlib import Path

from dash import Dash, Input, Output, callback, html

from personal_finance.components.layout import create_layout
from personal_finance.data.loader import FinanceData, load_excel, load_excel_from_bytes

# Default data path
DEFAULT_DATA_PATH = Path("data/PersonalFinance.xlsx")

# Global data store
_current_data: FinanceData | None = None


def load_default_data() -> FinanceData | None:
    """Try to load data from default path."""
    if DEFAULT_DATA_PATH.exists():
        try:
            return load_excel(DEFAULT_DATA_PATH)
        except Exception as e:
            print(f"Error loading default data: {e}")
            return None
    return None


def create_app() -> Dash:
    """Create and configure the Dash application."""
    global _current_data

    app = Dash(__name__, suppress_callback_exceptions=True)

    # Try loading default data
    _current_data = load_default_data()

    app.layout = html.Div(id="main-container", children=[create_layout(_current_data)])

    @callback(
        Output("main-container", "children"),
        Input("file-upload", "contents"),
        prevent_initial_call=True,
    )
    def handle_upload(contents: str | None):
        global _current_data

        if contents is None:
            return create_layout(_current_data)

        try:
            # Parse base64 content
            content_type, content_string = contents.split(",")
            decoded = base64.b64decode(content_string)

            # Load data from uploaded file
            _current_data = load_excel_from_bytes(decoded)

            return create_layout(_current_data)
        except Exception as e:
            return html.Div(
                [
                    create_layout(None),
                    html.Div(
                        f"Error loading file: {e}",
                        style={
                            "color": "#e63757",
                            "padding": "16px",
                            "backgroundColor": "#252540",
                            "borderRadius": "8px",
                            "marginTop": "16px",
                        },
                    ),
                ]
            )

    return app


def main():
    """Run the application."""
    app = create_app()
    app.run(debug=True, host="127.0.0.1", port=8050)


if __name__ == "__main__":
    main()
```

**Step 2: Run formatters**

```bash
uv run black src/personal_finance/app.py
uv run isort src/personal_finance/app.py
```

**Step 3: Commit**

```bash
git add src/personal_finance/app.py
git commit -m "feat: add main Dash app with file upload support"
```

---

## Task 15: Final Integration & Verification

**Step 1: Run the app**

```bash
uv run finance-dashboard
```

**Step 2: Verify in browser**

Open http://127.0.0.1:8050 and verify:
- Dashboard loads with default data from `data/PersonalFinance.xlsx`
- All 4 tabs display correctly (Summary, Net Worth, Income, Spending)
- Charts render with dark theme
- File upload works
- Metric cards show correct values

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete personal finance dashboard v1"
```

---

## Summary

The implementation creates a complete personal finance dashboard with:

1. **Data Layer**: Polars-based Excel loading with xlsx2csv engine
2. **Transform Layer**: Net worth, spending, income, and savings calculations
3. **Component Layer**: Reusable metric cards and tab components
4. **App Layer**: Dash app with file upload and dark theme

Total: 15 tasks, each with clear file paths and implementation steps.
