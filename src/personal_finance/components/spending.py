"""Spending tab component."""

import plotly.graph_objects as go
from dash import dcc, html

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
            fillcolor="rgba(180, 83, 9, 0.08)",
        )
    )

    fig.update_layout(
        title="Monthly Spending",
        xaxis_title="",
        yaxis_title="",
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
