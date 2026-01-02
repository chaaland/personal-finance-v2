# FIRE Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add FIRE tracking to the personal finance dashboard with progress metrics, projected FIRE date, and a trajectory chart.

**Architecture:** New `transforms/fire.py` module for FIRE calculations, new `components/fire.py` for the FIRE tab UI, updates to summary tab for FIRE cards. The FIRE tab uses Dash callbacks for reactive config inputs (withdrawal rate, lookback period).

**Tech Stack:** Polars (Decimal types), Dash, Plotly, Python 3.x

---

## Task 1: Create FIRE Transform Functions

**Files:**
- Create: `src/personal_finance/transforms/fire.py`
- Modify: `src/personal_finance/transforms/__init__.py`

**Step 1: Create fire.py with all transform functions**

```python
"""FIRE (Financial Independence, Retire Early) calculations.

Uses Decimal types for all currency calculations.
"""

from datetime import datetime
from decimal import Decimal
from typing import NamedTuple

import polars as pl

from personal_finance.data.loader import FinanceData
from personal_finance.transforms.networth import get_combined_networth, get_current_networth
from personal_finance.transforms.spending import get_projected_annual_spend


class FireProjection(NamedTuple):
    """Result of FIRE projection calculation."""

    fire_date: datetime | None  # None if already FIRE or can't project
    years_to_fire: Decimal | None
    annual_nw_growth: Decimal


def get_fire_number(data: FinanceData, withdrawal_rate: Decimal = Decimal("0.04")) -> Decimal:
    """Calculate FIRE number based on projected annual spending and withdrawal rate.

    FIRE number = projected_annual_spend / withdrawal_rate

    Args:
        data: Finance data
        withdrawal_rate: Safe withdrawal rate as decimal (e.g., 0.04 for 4%)

    Returns:
        FIRE number in USD
    """
    projected_spend = get_projected_annual_spend(data)
    if withdrawal_rate == 0:
        return Decimal("0")
    return projected_spend / withdrawal_rate


def get_fire_progress_pct(data: FinanceData, withdrawal_rate: Decimal = Decimal("0.04")) -> Decimal:
    """Calculate percentage progress toward FIRE number.

    Args:
        data: Finance data
        withdrawal_rate: Safe withdrawal rate as decimal

    Returns:
        Progress percentage (e.g., 42.5 for 42.5%)
    """
    fire_number = get_fire_number(data, withdrawal_rate)
    if fire_number == 0:
        return Decimal("0")
    current_nw = get_current_networth(data)
    return (current_nw / fire_number) * Decimal("100")


def get_current_runway_years(data: FinanceData) -> Decimal:
    """Calculate how many years current net worth would last at projected spending.

    Args:
        data: Finance data

    Returns:
        Years of runway
    """
    current_nw = get_current_networth(data)
    projected_spend = get_projected_annual_spend(data)
    if projected_spend == 0:
        return Decimal("0")
    return current_nw / projected_spend


def get_annual_nw_growth(data: FinanceData, lookback_years: int = 3) -> Decimal:
    """Calculate average annual net worth growth over lookback period.

    Uses linear regression approach: (end_value - start_value) / years

    Args:
        data: Finance data
        lookback_years: Number of years to look back

    Returns:
        Average annual growth in USD
    """
    combined = get_combined_networth(data)
    if combined.is_empty():
        return Decimal("0")

    most_recent_date = combined.select("Dates").row(-1)[0]
    cutoff_date = most_recent_date.replace(year=most_recent_date.year - lookback_years)

    # Filter to lookback period
    period_data = combined.filter(pl.col("Dates") >= cutoff_date).sort("Dates")

    if len(period_data) < 2:
        return Decimal("0")

    start_value = period_data.select("Total_USD").row(0)[0]
    end_value = period_data.select("Total_USD").row(-1)[0]
    start_date = period_data.select("Dates").row(0)[0]
    end_date = period_data.select("Dates").row(-1)[0]

    # Calculate actual years elapsed
    days_elapsed = (end_date - start_date).days
    if days_elapsed == 0:
        return Decimal("0")

    years_elapsed = Decimal(str(days_elapsed)) / Decimal("365.25")
    if years_elapsed == 0:
        return Decimal("0")

    return (end_value - start_value) / years_elapsed


def get_projected_fire_date(
    data: FinanceData,
    withdrawal_rate: Decimal = Decimal("0.04"),
    lookback_years: int = 3,
) -> FireProjection:
    """Project when FIRE will be achieved based on historical growth.

    Args:
        data: Finance data
        withdrawal_rate: Safe withdrawal rate as decimal
        lookback_years: Years of history to use for growth calculation

    Returns:
        FireProjection with date, years to FIRE, and annual growth
    """
    fire_number = get_fire_number(data, withdrawal_rate)
    current_nw = get_current_networth(data)
    annual_growth = get_annual_nw_growth(data, lookback_years)

    # Already at FIRE
    if current_nw >= fire_number:
        return FireProjection(fire_date=None, years_to_fire=Decimal("0"), annual_nw_growth=annual_growth)

    # No growth or negative growth - can't project
    if annual_growth <= 0:
        return FireProjection(fire_date=None, years_to_fire=None, annual_nw_growth=annual_growth)

    # Calculate years to FIRE
    gap = fire_number - current_nw
    years_to_fire = gap / annual_growth

    # Get most recent date and add years
    combined = get_combined_networth(data)
    most_recent_date = combined.select("Dates").row(-1)[0]

    # Calculate projected date
    days_to_add = int(float(years_to_fire) * 365.25)
    from datetime import timedelta

    fire_date = most_recent_date + timedelta(days=days_to_add)

    return FireProjection(fire_date=fire_date, years_to_fire=years_to_fire, annual_nw_growth=annual_growth)


def get_fire_projection_series(
    data: FinanceData,
    withdrawal_rate: Decimal = Decimal("0.04"),
    lookback_years: int = 3,
    projection_years: int = 2,
) -> tuple[pl.DataFrame, pl.DataFrame, Decimal]:
    """Get historical and projected net worth series for charting.

    Args:
        data: Finance data
        withdrawal_rate: Safe withdrawal rate as decimal
        lookback_years: Years of history for growth calculation
        projection_years: Years to project into future

    Returns:
        Tuple of (historical_df, projection_df, fire_number)
        - historical_df: Dates, Total_USD columns
        - projection_df: Dates, Total_USD columns (projected values)
        - fire_number: The FIRE target
    """
    from datetime import timedelta

    from personal_finance.data.loader import CURRENCY_DTYPE

    historical = get_combined_networth(data).select("Dates", "Total_USD")
    fire_number = get_fire_number(data, withdrawal_rate)
    annual_growth = get_annual_nw_growth(data, lookback_years)

    if historical.is_empty():
        empty_df = pl.DataFrame({"Dates": [], "Total_USD": []})
        return empty_df, empty_df, fire_number

    # Get current values
    most_recent_date = historical.select("Dates").row(-1)[0]
    current_nw = historical.select("Total_USD").row(-1)[0]

    # Create projection points (monthly for smooth line)
    months_to_project = projection_years * 12
    projection_dates = []
    projection_values = []

    for month in range(1, months_to_project + 1):
        proj_date = most_recent_date + timedelta(days=month * 30)
        years_elapsed = Decimal(str(month)) / Decimal("12")
        proj_value = current_nw + (annual_growth * years_elapsed)
        projection_dates.append(proj_date)
        projection_values.append(proj_value)

    projection_df = pl.DataFrame({
        "Dates": projection_dates,
        "Total_USD": projection_values,
    }).with_columns(pl.col("Total_USD").cast(CURRENCY_DTYPE))

    return historical, projection_df, fire_number
```

**Step 2: Update transforms/__init__.py to export FIRE functions**

Add to `src/personal_finance/transforms/__init__.py`:

```python
from personal_finance.transforms.fire import (
    FireProjection,
    get_annual_nw_growth,
    get_current_runway_years,
    get_fire_number,
    get_fire_progress_pct,
    get_fire_projection_series,
    get_projected_fire_date,
)
```

And add to `__all__`:

```python
    "FireProjection",
    "get_fire_number",
    "get_fire_progress_pct",
    "get_current_runway_years",
    "get_annual_nw_growth",
    "get_projected_fire_date",
    "get_fire_projection_series",
```

**Step 3: Run linting**

```bash
uv run black src/personal_finance/transforms/fire.py
uv run isort src/personal_finance/transforms/fire.py
```

**Step 4: Commit**

```bash
git add src/personal_finance/transforms/fire.py src/personal_finance/transforms/__init__.py
git commit -m "feat: add FIRE calculation transforms"
```

---

## Task 2: Create FIRE Tab Component

**Files:**
- Create: `src/personal_finance/components/fire.py`

**Step 1: Create fire.py component**

```python
"""FIRE tab component with projection chart and configurable inputs."""

from decimal import Decimal

import plotly.graph_objects as go
from dash import dcc, html

from personal_finance.components.cards import metric_card
from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, FONTS, STYLES
from personal_finance.transforms import (
    get_current_runway_years,
    get_fire_number,
    get_fire_projection_series,
    get_projected_fire_date,
)


def create_fire_config_row() -> html.Div:
    """Create the configuration inputs row."""
    input_style = {
        "width": "80px",
        "padding": "8px 12px",
        "border": f"1px solid {COLORS['border']}",
        "borderRadius": "2px",
        "fontFamily": FONTS["body"],
        "fontSize": "14px",
        "color": COLORS["text_primary"],
        "backgroundColor": COLORS["card"],
        "textAlign": "right",
    }

    label_style = {
        "fontSize": "11px",
        "fontWeight": "600",
        "fontFamily": FONTS["body"],
        "color": COLORS["text_muted"],
        "textTransform": "uppercase",
        "letterSpacing": "0.1em",
        "marginBottom": "8px",
    }

    suffix_style = {
        "fontSize": "14px",
        "color": COLORS["text_secondary"],
        "marginLeft": "6px",
    }

    return html.Div(
        style={
            "display": "flex",
            "gap": "32px",
            "marginBottom": "24px",
            "padding": "20px 24px",
            "backgroundColor": COLORS["card"],
            "border": f"1px solid {COLORS['border']}",
            "borderRadius": "2px",
        },
        children=[
            html.Div(
                children=[
                    html.Label("Withdrawal Rate", style=label_style),
                    html.Div(
                        style={"display": "flex", "alignItems": "center"},
                        children=[
                            dcc.Input(
                                id="fire-withdrawal-rate",
                                type="number",
                                value=4.0,
                                min=1.0,
                                max=10.0,
                                step=0.5,
                                style=input_style,
                            ),
                            html.Span("%", style=suffix_style),
                        ],
                    ),
                ]
            ),
            html.Div(
                children=[
                    html.Label("Lookback Period", style=label_style),
                    html.Div(
                        style={"display": "flex", "alignItems": "center"},
                        children=[
                            dcc.Input(
                                id="fire-lookback-years",
                                type="number",
                                value=3,
                                min=1,
                                max=10,
                                step=1,
                                style=input_style,
                            ),
                            html.Span("years", style=suffix_style),
                        ],
                    ),
                ]
            ),
        ],
    )


def create_fire_metrics_row(
    fire_number: Decimal,
    runway_years: Decimal,
    fire_date_str: str,
    years_to_fire_str: str,
    withdrawal_rate: float,
) -> html.Div:
    """Create the metrics row with three cards."""
    # Custom card for FIRE number with subtext
    fire_number_card = html.Div(
        style={
            **STYLES["card"],
            "borderTop": f"3px solid {COLORS['accent']}",
        },
        children=[
            html.P("FIRE Number", style=STYLES["metric_label"]),
            html.P(
                f"${float(fire_number):,.0f}",
                style=STYLES["metric_value"],
            ),
            html.P(
                f"at {withdrawal_rate:.1f}% withdrawal rate",
                style={
                    "fontSize": "13px",
                    "color": COLORS["text_secondary"],
                    "marginTop": "8px",
                },
            ),
        ],
    )

    # Custom card for runway
    runway_card = html.Div(
        style={
            **STYLES["card"],
            "borderTop": f"3px solid {COLORS['accent']}",
        },
        children=[
            html.P("Current Runway", style=STYLES["metric_label"]),
            html.P(
                f"{float(runway_years):.1f} years",
                style=STYLES["metric_value"],
            ),
            html.P(
                "if you stopped working today",
                style={
                    "fontSize": "13px",
                    "color": COLORS["text_secondary"],
                    "marginTop": "8px",
                },
            ),
        ],
    )

    # Custom card for projected FIRE date
    fire_date_card = html.Div(
        style={
            **STYLES["card"],
            "borderTop": f"3px solid {COLORS['accent']}",
        },
        children=[
            html.P("Projected FIRE Date", style=STYLES["metric_label"]),
            html.P(
                fire_date_str,
                style=STYLES["metric_value"],
            ),
            html.P(
                years_to_fire_str,
                style={
                    "fontSize": "13px",
                    "color": COLORS["text_secondary"],
                    "marginTop": "8px",
                },
            ),
        ],
    )

    return html.Div(
        style=STYLES["grid"],
        children=[fire_number_card, runway_card, fire_date_card],
    )


def create_fire_projection_chart(
    data: FinanceData,
    withdrawal_rate: Decimal,
    lookback_years: int,
) -> dcc.Graph:
    """Create the FIRE projection chart."""
    historical, projection, fire_number = get_fire_projection_series(
        data, withdrawal_rate, lookback_years, projection_years=2
    )

    fig = go.Figure()

    # Historical line (solid)
    if not historical.is_empty():
        fig.add_trace(
            go.Scatter(
                x=historical["Dates"].to_list(),
                y=[float(v) for v in historical["Total_USD"].to_list()],
                mode="lines",
                name="Historical",
                line={"color": COLORS["chart_1"], "width": 2},
                hovertemplate="$%{y:,.0f}<extra></extra>",
            )
        )

    # Projection line (dashed)
    if not projection.is_empty():
        fig.add_trace(
            go.Scatter(
                x=projection["Dates"].to_list(),
                y=[float(v) for v in projection["Total_USD"].to_list()],
                mode="lines",
                name="Projected",
                line={"color": COLORS["chart_1"], "width": 2, "dash": "dash"},
                hovertemplate="$%{y:,.0f} (projected)<extra></extra>",
            )
        )

    # FIRE threshold line
    if not historical.is_empty() and not projection.is_empty():
        all_dates = historical["Dates"].to_list() + projection["Dates"].to_list()
        fig.add_trace(
            go.Scatter(
                x=[min(all_dates), max(all_dates)],
                y=[float(fire_number), float(fire_number)],
                mode="lines",
                name="FIRE Target",
                line={"color": COLORS["accent"], "width": 2, "dash": "dot"},
                hovertemplate="FIRE Target: $%{y:,.0f}<extra></extra>",
            )
        )

    fig.update_layout(
        **CHART_TEMPLATE["layout"],
        title="Net Worth Trajectory",
        xaxis_title="",
        yaxis_title="",
        yaxis_tickprefix="$",
        showlegend=True,
        height=400,
    )

    return dcc.Graph(figure=fig, config={"displayModeBar": False})


def create_fire_tab(data: FinanceData) -> html.Div:
    """Create the complete FIRE tab content."""
    # Default values
    withdrawal_rate = Decimal("0.04")
    lookback_years = 3

    # Calculate metrics
    fire_number = get_fire_number(data, withdrawal_rate)
    runway_years = get_current_runway_years(data)
    projection = get_projected_fire_date(data, withdrawal_rate, lookback_years)

    # Format FIRE date
    if projection.years_to_fire is not None and projection.years_to_fire == 0:
        fire_date_str = "FIRE Ready"
        years_to_fire_str = "You've reached your target!"
    elif projection.fire_date is not None:
        fire_date_str = projection.fire_date.strftime("%b %Y")
        years_to_fire_str = f"{float(projection.years_to_fire):.1f} years from now"
    else:
        fire_date_str = "N/A"
        years_to_fire_str = "Insufficient growth data"

    return html.Div(
        id="fire-tab-content",
        children=[
            create_fire_config_row(),
            create_fire_metrics_row(
                fire_number=fire_number,
                runway_years=runway_years,
                fire_date_str=fire_date_str,
                years_to_fire_str=years_to_fire_str,
                withdrawal_rate=float(withdrawal_rate) * 100,
            ),
            html.Div(
                style=STYLES["chart_container"],
                children=[
                    create_fire_projection_chart(data, withdrawal_rate, lookback_years)
                ],
            ),
        ],
    )
```

**Step 2: Run linting**

```bash
uv run black src/personal_finance/components/fire.py
uv run isort src/personal_finance/components/fire.py
```

**Step 3: Commit**

```bash
git add src/personal_finance/components/fire.py
git commit -m "feat: add FIRE tab component with projection chart"
```

---

## Task 3: Add FIRE Tab to Layout

**Files:**
- Modify: `src/personal_finance/components/layout.py:33-84`

**Step 1: Import fire component**

Add import at top of layout.py:

```python
from personal_finance.components.fire import create_fire_tab
```

**Step 2: Add FIRE tab to create_tabs function**

Add new tab after Spending tab (before the closing bracket of the tabs children list):

```python
                    dcc.Tab(
                        label="FIRE",
                        value="fire",
                        style=STYLES["tab"],
                        selected_style=STYLES["tab_selected"],
                        children=html.Div(
                            style={"paddingTop": "32px"},
                            children=create_fire_tab(data),
                        ),
                    ),
```

**Step 3: Run linting**

```bash
uv run black src/personal_finance/components/layout.py
uv run isort src/personal_finance/components/layout.py
```

**Step 4: Commit**

```bash
git add src/personal_finance/components/layout.py
git commit -m "feat: add FIRE tab to dashboard layout"
```

---

## Task 4: Add Dash Callbacks for Reactive FIRE Tab

**Files:**
- Modify: `src/personal_finance/app.py`

**Step 1: Add callback imports and FIRE callback**

Add imports at top:

```python
from decimal import Decimal

from dash import Input, Output, State, callback, html, no_update
```

Add after existing handle_upload callback (inside create_app function):

```python
    @callback(
        Output("fire-tab-content", "children"),
        Input("fire-withdrawal-rate", "value"),
        Input("fire-lookback-years", "value"),
        prevent_initial_call=True,
    )
    def update_fire_tab(withdrawal_rate: float | None, lookback_years: int | None):
        global _current_data

        if _current_data is None:
            return no_update

        # Use defaults if invalid
        wr = Decimal(str(withdrawal_rate / 100)) if withdrawal_rate else Decimal("0.04")
        lb = int(lookback_years) if lookback_years else 3

        from personal_finance.components.fire import (
            create_fire_config_row,
            create_fire_metrics_row,
            create_fire_projection_chart,
        )
        from personal_finance.theme import STYLES
        from personal_finance.transforms import (
            get_current_runway_years,
            get_fire_number,
            get_projected_fire_date,
        )

        # Recalculate metrics
        fire_number = get_fire_number(_current_data, wr)
        runway_years = get_current_runway_years(_current_data)
        projection = get_projected_fire_date(_current_data, wr, lb)

        # Format FIRE date
        if projection.years_to_fire is not None and projection.years_to_fire == 0:
            fire_date_str = "FIRE Ready"
            years_to_fire_str = "You've reached your target!"
        elif projection.fire_date is not None:
            fire_date_str = projection.fire_date.strftime("%b %Y")
            years_to_fire_str = f"{float(projection.years_to_fire):.1f} years from now"
        else:
            fire_date_str = "N/A"
            years_to_fire_str = "Insufficient growth data"

        return [
            create_fire_config_row(),
            create_fire_metrics_row(
                fire_number=fire_number,
                runway_years=runway_years,
                fire_date_str=fire_date_str,
                years_to_fire_str=years_to_fire_str,
                withdrawal_rate=float(wr) * 100,
            ),
            html.Div(
                style=STYLES["chart_container"],
                children=[create_fire_projection_chart(_current_data, wr, lb)],
            ),
        ]
```

**Step 2: Run linting**

```bash
uv run black src/personal_finance/app.py
uv run isort src/personal_finance/app.py
```

**Step 3: Commit**

```bash
git add src/personal_finance/app.py
git commit -m "feat: add reactive callbacks for FIRE tab inputs"
```

---

## Task 5: Add FIRE Cards to Summary Tab

**Files:**
- Modify: `src/personal_finance/components/summary.py`
- Modify: `src/personal_finance/components/cards.py`

**Step 1: Add new card type for FIRE progress in cards.py**

Add new function to cards.py:

```python
def fire_progress_card(
    label: str,
    progress_pct: float,
    current_value: float,
    target_value: float,
) -> html.Div:
    """Create a FIRE progress card showing percentage and values.

    Args:
        label: Card title/label
        progress_pct: Percentage progress (e.g., 42.5)
        current_value: Current net worth
        target_value: FIRE number

    Returns:
        Dash HTML component for the card
    """
    card_style = {
        **STYLES["card"],
        "borderTop": f"3px solid {COLORS['accent']}",
    }

    return html.Div(
        style=card_style,
        children=[
            html.P(label, style=STYLES["metric_label"]),
            html.P(f"{progress_pct:.0f}%", style=STYLES["metric_value"]),
            html.P(
                f"{format_currency(current_value)} / {format_currency(target_value)}",
                style={
                    "fontSize": "13px",
                    "color": COLORS["text_secondary"],
                    "marginTop": "8px",
                },
            ),
        ],
    )


def fire_date_card(
    label: str,
    fire_date_str: str,
    years_remaining_str: str,
) -> html.Div:
    """Create a FIRE date card.

    Args:
        label: Card title/label
        fire_date_str: Formatted date string (e.g., "Oct 2034")
        years_remaining_str: Subtext (e.g., "8.5 years at current pace")

    Returns:
        Dash HTML component for the card
    """
    card_style = {
        **STYLES["card"],
        "borderTop": f"3px solid {COLORS['accent']}",
    }

    return html.Div(
        style=card_style,
        children=[
            html.P(label, style=STYLES["metric_label"]),
            html.P(fire_date_str, style=STYLES["metric_value"]),
            html.P(
                years_remaining_str,
                style={
                    "fontSize": "13px",
                    "color": COLORS["text_secondary"],
                    "marginTop": "8px",
                },
            ),
        ],
    )
```

Also add COLORS import at top of cards.py:

```python
from personal_finance.theme import COLORS, STYLES, format_change, format_currency, format_percentage
```

**Step 2: Update summary.py to include FIRE cards**

Update imports:

```python
from personal_finance.components.cards import fire_date_card, fire_progress_card, metric_card
from personal_finance.transforms import (
    get_current_networth,
    get_current_year_savings_rate,
    get_fire_number,
    get_fire_progress_pct,
    get_projected_annual_spend,
    get_projected_fire_date,
    get_yoy_spending_comparison,
    get_ytd_gross_income,
    get_ytd_networth_change,
)
```

Add FIRE calculations and cards to create_summary_tab:

```python
def create_summary_tab(data: FinanceData) -> html.Div:
    """Create the summary tab content with key metrics."""
    from decimal import Decimal

    # Calculate all metrics
    current_networth = get_current_networth(data)
    ytd_nw_change, ytd_nw_pct = get_ytd_networth_change(data)
    ytd_gross = get_ytd_gross_income(data)
    projected_spend = get_projected_annual_spend(data)
    yoy_spend_diff, yoy_spend_pct = get_yoy_spending_comparison(data)
    savings_rate = get_current_year_savings_rate(data)

    # FIRE metrics (using defaults: 4% withdrawal, 3 year lookback)
    withdrawal_rate = Decimal("0.04")
    fire_number = get_fire_number(data, withdrawal_rate)
    fire_progress = get_fire_progress_pct(data, withdrawal_rate)
    fire_projection = get_projected_fire_date(data, withdrawal_rate, lookback_years=3)

    # Format FIRE date
    if fire_projection.years_to_fire is not None and fire_projection.years_to_fire == 0:
        fire_date_str = "FIRE Ready"
        years_str = "Target reached!"
    elif fire_projection.fire_date is not None:
        fire_date_str = fire_projection.fire_date.strftime("%b %Y")
        years_str = f"{float(fire_projection.years_to_fire):.1f} years at current pace"
    else:
        fire_date_str = "N/A"
        years_str = "Insufficient data"

    return html.Div(
        style=STYLES["grid"],
        children=[
            metric_card(
                label="Current Net Worth",
                value=current_networth,
                change=ytd_nw_pct,
                change_is_percentage=True,
                change_absolute=ytd_nw_change,
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
                invert_change_colors=True,
                change_absolute=yoy_spend_diff,
            ),
            metric_card(
                label="Savings Rate (This Year)",
                value=savings_rate,
                value_is_percentage=True,
            ),
            fire_progress_card(
                label="FIRE Progress",
                progress_pct=float(fire_progress),
                current_value=float(current_networth),
                target_value=float(fire_number),
            ),
            fire_date_card(
                label="Projected FIRE Date",
                fire_date_str=fire_date_str,
                years_remaining_str=years_str,
            ),
        ],
    )
```

**Step 3: Run linting**

```bash
uv run black src/personal_finance/components/cards.py src/personal_finance/components/summary.py
uv run isort src/personal_finance/components/cards.py src/personal_finance/components/summary.py
```

**Step 4: Commit**

```bash
git add src/personal_finance/components/cards.py src/personal_finance/components/summary.py
git commit -m "feat: add FIRE progress and date cards to summary tab"
```

---

## Task 6: Manual Testing

**Step 1: Run the application**

```bash
cd /Users/chaaland/Documents/.FinanceStuff/personal-finance-v2
uv run python -m personal_finance.app
```

**Step 2: Verify in browser at http://127.0.0.1:8050**

Check:
- [ ] Summary tab shows 6 cards (4 original + 2 FIRE cards)
- [ ] FIRE Progress card shows percentage and current/target values
- [ ] Projected FIRE Date card shows date and years remaining
- [ ] FIRE tab appears after Spending tab
- [ ] FIRE tab shows configuration inputs (withdrawal rate, lookback)
- [ ] FIRE tab shows 3 metric cards
- [ ] FIRE tab shows projection chart with historical, projected, and target lines
- [ ] Changing withdrawal rate updates all metrics and chart
- [ ] Changing lookback period updates projection

**Step 3: Stop the server (Ctrl+C)**
