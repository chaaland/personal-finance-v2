"""Spending tab component."""

import plotly.graph_objects as go
from dash import dcc, html

from personal_finance.components.cards import metric_card
from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, STYLES
from personal_finance.transforms import (
    get_monthly_spending_with_median,
    get_projected_annual_spend,
    get_savings_rate_by_year,
    get_spending_by_year,
    get_yoy_spending_comparison,
)


def create_spending_chart(data: FinanceData) -> go.Figure:
    """Create monthly spending line chart with rolling median."""
    df = get_monthly_spending_with_median(data)

    fig = go.Figure()

    # Raw data as faded/dotted line
    fig.add_trace(
        go.Scatter(
            x=df["Dates"].to_list(),
            y=df["Total_USD"].to_list(),
            mode="lines",
            name="Monthly",
            line={"color": COLORS["chart_1"], "width": 1, "dash": "dot"},
            opacity=0.5,
        )
    )

    # Rolling median as primary solid line with fill
    fig.add_trace(
        go.Scatter(
            x=df["Dates"].to_list(),
            y=df["Median_USD"].to_list(),
            mode="lines",
            name="4-Month Median",
            line={"color": COLORS["chart_1"], "width": 2.5},
            fill="tozeroy",
            fillcolor="rgba(212, 168, 83, 0.12)",  # Gold fill for dark mode
        )
    )

    fig.update_layout(
        title="Monthly Spending",
        xaxis_title="",
        yaxis_title="",
        yaxis_tickprefix="$",
        template=CHART_TEMPLATE,
    )

    return fig


def create_annual_spending_chart(data: FinanceData) -> go.Figure:
    """Create annual spending bar chart."""
    df = get_spending_by_year(data)

    fig = go.Figure(
        go.Bar(
            x=df["Year"].to_list(),
            y=[float(v) for v in df["Total_USD"].to_list()],
            marker_color=COLORS["chart_1"],
            text=[f"${v:,.0f}" for v in df["Total_USD"].to_list()],
            textposition="outside",
            textfont={"size": 11, "color": COLORS["text_secondary"]},
        )
    )

    fig.update_layout(
        title="Annual Spending",
        xaxis_title="",
        yaxis_title="",
        yaxis_tickprefix="$",
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
            textfont={"size": 11, "color": COLORS["text_secondary"]},
        )
    )

    fig.update_layout(
        title="Savings Rate by Year",
        xaxis_title="",
        yaxis_title="",
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
                style={**STYLES["grid"], "gridTemplateColumns": "repeat(1, 1fr)"},
                children=[
                    metric_card(
                        label="Projected Spend (This Year)",
                        value=projected_spend,
                        change=yoy_pct,
                        change_is_percentage=True,
                        invert_change_colors=True,
                        change_absolute=yoy_diff,
                    ),
                ],
            ),
            # Monthly spending chart
            html.Div(
                style=STYLES["chart_container"],
                children=[dcc.Graph(figure=create_spending_chart(data), config={"displayModeBar": False})],
            ),
            # Annual spending chart
            html.Div(
                style=STYLES["chart_container"],
                children=[dcc.Graph(figure=create_annual_spending_chart(data), config={"displayModeBar": False})],
            ),
            # Savings rate chart
            html.Div(
                style=STYLES["chart_container"],
                children=[dcc.Graph(figure=create_savings_rate_chart(data), config={"displayModeBar": False})],
            ),
        ]
    )
