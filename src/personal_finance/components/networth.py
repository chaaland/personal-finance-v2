"""Net worth tab component."""

import plotly.graph_objects as go
from dash import dcc, html

from personal_finance.components.cards import metric_card
from personal_finance.components.fire import FIRE_GOAL
from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, STYLES
from personal_finance.transforms import (
    get_combined_networth,
    get_current_networth,
    get_fire_projection_series,
    get_yoy_networth_changes,
    get_ytd_networth_change,
)


def create_networth_chart(data: FinanceData, lookback_years: int = 3) -> go.Figure:
    """Create net worth over time line chart with FIRE projection."""
    historical_df = get_combined_networth(data)
    _, projection_df, _ = get_fire_projection_series(
        data, fire_goal=FIRE_GOAL, lookback_years=lookback_years, projection_years=2
    )

    fig = go.Figure()

    # Total net worth (primary) - with subtle fill
    fig.add_trace(
        go.Scatter(
            x=historical_df["Dates"].to_list(),
            y=historical_df["Total_USD"].to_list(),
            name="Total",
            line={"color": COLORS["chart_1"], "width": 2.5},
            mode="lines",
            fill="tozeroy",
            fillcolor="rgba(180, 83, 9, 0.08)",
            hovertemplate="$%{y:,.0f}<extra></extra>",
        )
    )

    # US net worth (secondary)
    fig.add_trace(
        go.Scatter(
            x=historical_df["Dates"].to_list(),
            y=historical_df["US_USD"].to_list(),
            name="US",
            line={"color": COLORS["chart_2"], "width": 1.5, "dash": "dot"},
            mode="lines",
            hovertemplate="$%{y:,.0f}<extra></extra>",
        )
    )

    # UK net worth (secondary)
    fig.add_trace(
        go.Scatter(
            x=historical_df["Dates"].to_list(),
            y=historical_df["UK_USD"].to_list(),
            name="UK",
            line={"color": COLORS["chart_3"], "width": 1.5, "dash": "dot"},
            mode="lines",
            hovertemplate="$%{y:,.0f}<extra></extra>",
        )
    )

    # FIRE projection line (dashed)
    if not projection_df.is_empty():
        fig.add_trace(
            go.Scatter(
                x=projection_df["Dates"].to_list(),
                y=[float(v) for v in projection_df["Total_USD"].to_list()],
                name="Projected",
                line={"color": COLORS["chart_1"], "width": 2, "dash": "dash"},
                mode="lines",
                hovertemplate="$%{y:,.0f} (projected)<extra></extra>",
            )
        )

    # FIRE target threshold line
    all_dates = historical_df["Dates"].to_list()
    if not projection_df.is_empty():
        all_dates = all_dates + projection_df["Dates"].to_list()

    fig.add_trace(
        go.Scatter(
            x=[min(all_dates), max(all_dates)],
            y=[float(FIRE_GOAL), float(FIRE_GOAL)],
            name="FIRE Target",
            line={"color": COLORS["accent"], "width": 2, "dash": "dot"},
            mode="lines",
            hovertemplate="FIRE Target: $%{y:,.0f}<extra></extra>",
        )
    )

    fig.update_layout(
        title="Net Worth Over Time",
        xaxis_title="",
        yaxis_title="",
        yaxis_tickprefix="$",
        template=CHART_TEMPLATE,
        hovermode="x unified",
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
            text=[f"${c / 1000:+,.0f}K" for c in df["Change"].to_list()],
            textposition="outside",
            textfont={"size": 11, "color": COLORS["text_secondary"]},
        )
    )

    fig.update_layout(
        title="Year-over-Year Change",
        xaxis_title="",
        yaxis_title="",
        yaxis_tickprefix="$",
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
                style={**STYLES["grid"], "gridTemplateColumns": "repeat(1, 1fr)"},
                children=[
                    metric_card(
                        label="Current Net Worth",
                        value=current_nw,
                        change=ytd_pct,
                        change_is_percentage=True,
                        change_absolute=ytd_change,
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
