"""Summary tab component."""

from decimal import Decimal

import polars as pl
import plotly.graph_objects as go
from dash import dcc, html

from personal_finance.components.cards import expandable_metric_card, fire_date_card, fire_progress_card
from personal_finance.components.fire import FIRE_GOAL
from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, STYLES, format_currency
from personal_finance.transforms import (
    get_current_networth,
    get_current_runway_years,
    get_current_year_savings_rate,
    get_fire_progress_pct,
    get_projected_annual_spend,
    get_projected_fire_date,
    get_savings_rate_details,
    get_spending_projection_details,
    get_swr_sensitivity,
    get_yoy_income_comparison,
    get_yoy_spending_comparison,
    get_ytd_gross_income,
    get_ytd_income_details,
    get_ytd_networth_change,
    get_ytd_networth_details,
)

# SWR values for sensitivity analysis: 3%, 3.5%, 4%, 4.5%
SWR_RATES = [Decimal("0.03"), Decimal("0.035"), Decimal("0.04"), Decimal("0.045")]


def create_swr_sensitivity_chart(data: FinanceData, lookback_years: int = 3) -> go.Figure:
    """Create horizontal bar chart showing FIRE dates at different withdrawal rates.

    X-axis: Timeline (dates)
    Y-axis: SWR labels (3%, 3.5%, 4%, 4.5%)

    Uses FIRE_GOAL as the base (at 4% SWR), and scales for other SWR values.
    """
    sensitivity_df = get_swr_sensitivity(
        data, SWR_RATES, lookback_years, base_fire_goal=FIRE_GOAL, base_swr=Decimal("0.04")
    )

    # Filter out rows where FireDate is None (insufficient data)
    valid_df = sensitivity_df.filter(pl.col("FireDate").is_not_null())

    if valid_df.is_empty():
        fig = go.Figure()
        fig.update_layout(
            title="FIRE Date by Withdrawal Rate",
            template=CHART_TEMPLATE,
            annotations=[
                {
                    "text": "Insufficient data to project FIRE dates",
                    "xref": "paper",
                    "yref": "paper",
                    "x": 0.5,
                    "y": 0.5,
                    "showarrow": False,
                    "font": {"size": 14, "color": COLORS["text_secondary"]},
                }
            ],
        )
        return fig

    # Extract data for chart
    swr_labels = [f"{float(swr):.1f}%" for swr in valid_df["SWR"].to_list()]
    fire_dates = valid_df["FireDate"].to_list()
    years_to_fire = valid_df["YearsToFire"].to_list()

    # Format hover text
    hover_text = [
        f"{label}<br>{date.strftime('%b %Y')}<br>{float(years):.1f} years"
        for label, date, years in zip(swr_labels, fire_dates, years_to_fire)
    ]

    fig = go.Figure(
        go.Bar(
            y=swr_labels,
            x=fire_dates,
            orientation="h",
            marker_color=COLORS["chart_1"],
            text=[d.strftime("%b %Y") for d in fire_dates],
            textposition="outside",
            textfont={"size": 12, "color": COLORS["text_secondary"]},
            hovertext=hover_text,
            hoverinfo="text",
        )
    )

    fig.update_layout(
        title="FIRE Date by Withdrawal Rate",
        xaxis_title="",
        yaxis_title="",
        template=CHART_TEMPLATE,
        height=250,
        showlegend=False,
        yaxis={"categoryorder": "array", "categoryarray": list(reversed(swr_labels))},
        margin={"t": 60, "r": 80, "b": 40, "l": 60},
    )

    return fig


def create_summary_tab(data: FinanceData) -> html.Div:
    """Create the summary tab content with key metrics."""
    # Calculate all metrics
    current_networth = get_current_networth(data)
    ytd_nw_change, ytd_nw_pct = get_ytd_networth_change(data)
    nw_details = get_ytd_networth_details(data)
    ytd_gross = get_ytd_gross_income(data)
    yoy_income_diff, yoy_income_pct = get_yoy_income_comparison(data)
    income_details = get_ytd_income_details(data)
    projected_spend = get_projected_annual_spend(data)
    yoy_spend_diff, yoy_spend_pct = get_yoy_spending_comparison(data)
    spend_details = get_spending_projection_details(data)
    savings_rate = get_current_year_savings_rate(data)
    savings_details = get_savings_rate_details(data)

    # FIRE metrics
    fire_progress = get_fire_progress_pct(data, FIRE_GOAL)
    fire_projection = get_projected_fire_date(data, fire_goal=FIRE_GOAL, lookback_years=3)
    runway_years = get_current_runway_years(data)

    # Format FIRE date
    pace_str = format_currency(float(fire_projection.annual_nw_growth))
    if fire_projection.years_to_fire is not None and fire_projection.years_to_fire == 0:
        fire_date_str = "FIRE Ready"
        years_str = "Target reached!"
    elif fire_projection.fire_date is not None:
        fire_date_str = fire_projection.fire_date.strftime("%b %Y")
        years_str = f"{float(fire_projection.years_to_fire):.1f} years at current pace of {pace_str}/yr"
    else:
        fire_date_str = "N/A"
        years_str = "Insufficient data"

    return html.Div(
        children=[
            # Metrics grid
            html.Div(
                style=STYLES["grid"],
                children=[
                    expandable_metric_card(
                        card_id="networth-card",
                        label="Current Net Worth",
                        value=current_networth,
                        detail_text=nw_details.format_explanation(),
                        change=ytd_nw_pct,
                        change_is_percentage=True,
                        change_absolute=ytd_nw_change,
                    ),
                    expandable_metric_card(
                        card_id="income-card",
                        label="Total Comp (YTD)",
                        value=ytd_gross,
                        detail_text=income_details.format_explanation(),
                        change=yoy_income_pct,
                        change_is_percentage=True,
                        change_absolute=yoy_income_diff,
                    ),
                    expandable_metric_card(
                        card_id="spending-card",
                        label="Projected Spend (This Year)",
                        value=projected_spend,
                        detail_text=spend_details.format_explanation(),
                        change=yoy_spend_pct,
                        change_is_percentage=True,
                        change_absolute=yoy_spend_diff,
                        invert_change_colors=True,
                    ),
                    expandable_metric_card(
                        card_id="savings-card",
                        label="Savings Rate (This Year)",
                        value=savings_rate,
                        detail_text=savings_details.format_explanation(),
                        change=savings_details.change,
                        change_is_percentage=True,
                        value_is_percentage=True,
                    ),
                    fire_progress_card(
                        card_id="fire-progress-card",
                        label="FIRE Progress",
                        progress_pct=float(fire_progress),
                        current_value=float(current_networth),
                        target_value=float(FIRE_GOAL),
                        runway_years=float(runway_years),
                        projected_spend=float(projected_spend),
                    ),
                    html.Div(
                        id="summary-fire-date-card",
                        children=fire_date_card(
                            label="Projected FIRE Date",
                            fire_date_str=fire_date_str,
                            years_remaining_str=years_str,
                        ),
                    ),
                ],
            ),
            # SWR Sensitivity Chart
            html.Div(
                style=STYLES["chart_container"],
                children=[
                    dcc.Graph(
                        figure=create_swr_sensitivity_chart(data),
                        config={"displayModeBar": False},
                    )
                ],
            ),
        ],
    )
