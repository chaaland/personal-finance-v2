"""FIRE tab component with projection chart and configurable inputs."""

from decimal import Decimal

import plotly.graph_objects as go
from dash import dcc, html

from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, FONTS, STYLES
from personal_finance.transforms import (
    get_current_runway_years,
    get_fire_projection_series,
    get_projected_fire_date,
)

# Hardcoded FIRE goal
FIRE_GOAL = Decimal("3500000")


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
) -> html.Div:
    """Create the metrics row with three cards."""
    # Custom card for FIRE number with subtext
    fire_number_card = html.Div(
        style={
            **STYLES["card"],
            "borderTop": f"3px solid {COLORS['accent']}",
        },
        children=[
            html.P("FIRE Goal", style=STYLES["metric_label"]),
            html.P(
                f"${float(fire_number):,.0f}",
                style=STYLES["metric_value"],
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
    fire_goal: Decimal,
    lookback_years: int,
) -> dcc.Graph:
    """Create the FIRE projection chart."""
    historical, projection, _ = get_fire_projection_series(
        data, fire_goal=fire_goal, lookback_years=lookback_years, projection_years=2
    )
    fire_number = fire_goal

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
        title="Net Worth Trajectory",
        xaxis_title="",
        yaxis_title="",
        yaxis_tickprefix="$",
        template=CHART_TEMPLATE,
        showlegend=True,
        height=400,
    )

    return dcc.Graph(figure=fig, config={"displayModeBar": False})


def create_fire_tab(data: FinanceData) -> html.Div:
    """Create the complete FIRE tab content."""
    lookback_years = 3

    runway_years = get_current_runway_years(data)
    projection = get_projected_fire_date(data, fire_goal=FIRE_GOAL, lookback_years=lookback_years)

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
                fire_number=FIRE_GOAL,
                runway_years=runway_years,
                fire_date_str=fire_date_str,
                years_to_fire_str=years_to_fire_str,
            ),
        ],
    )
