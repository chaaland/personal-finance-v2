"""Income tab component."""

import plotly.graph_objects as go
from dash import dcc, html

from personal_finance.components.cards import metric_card
from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, STYLES
from personal_finance.transforms import (
    get_income_by_year,
    get_yoy_income_comparison,
    get_yoy_net_income_comparison,
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
        title="Annual Income",
        xaxis_title="",
        yaxis_title="",
        yaxis_tickprefix="$",
        template=CHART_TEMPLATE,
        barmode="group",
    )

    return fig


def create_income_tab(data: FinanceData) -> html.Div:
    """Create the income tab content."""
    ytd_gross = get_ytd_gross_income(data)
    ytd_net = get_ytd_net_income(data)
    yoy_gross_diff, yoy_gross_pct = get_yoy_income_comparison(data)
    yoy_net_diff, yoy_net_pct = get_yoy_net_income_comparison(data)

    return html.Div(
        children=[
            # Metrics row
            html.Div(
                style={**STYLES["grid"], "gridTemplateColumns": "repeat(2, 1fr)"},
                children=[
                    metric_card(
                        label="Total Comp (YTD)",
                        value=ytd_gross,
                        change=yoy_gross_pct,
                        change_is_percentage=True,
                        change_absolute=yoy_gross_diff,
                    ),
                    metric_card(
                        label="Net Pay (YTD)",
                        value=ytd_net,
                        change=yoy_net_pct,
                        change_is_percentage=True,
                        change_absolute=yoy_net_diff,
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
