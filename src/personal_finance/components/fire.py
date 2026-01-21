"""FIRE tab component with projection chart and configurable inputs."""

from decimal import Decimal

import plotly.graph_objects as go
from dash import dcc, html

from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, STYLES
from personal_finance.transforms import (
    WITHDRAWAL_ORDER,
    get_current_runway_years,
    get_fire_projection_series,
    get_projected_fire_date,
    get_retirement_drawdown_series,
)

# Hardcoded FIRE goal
FIRE_GOAL = Decimal("4250000")


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


# Stratified Wealth palette - desaturated jewel tones with transparency
# Ordered from warm (cash/liquid) to cool (tax-advantaged growth)
# Each has a fill color (with opacity) and a line color (more saturated edge)
ACCOUNT_PALETTE = {
    "HYSA": {
        "fill": "rgba(251, 191, 114, 0.55)",  # Warm amber - liquid cash
        "line": "rgba(251, 191, 114, 0.85)",
    },
    "Coinbase": {
        "fill": "rgba(245, 158, 89, 0.55)",  # Burnt orange - volatile
        "line": "rgba(245, 158, 89, 0.85)",
    },
    "Taxable Brokerage": {
        "fill": "rgba(134, 182, 159, 0.55)",  # Sage green - taxable growth
        "line": "rgba(134, 182, 159, 0.85)",
    },
    "401k": {
        "fill": "rgba(116, 165, 193, 0.55)",  # Steel blue - employer retirement
        "line": "rgba(116, 165, 193, 0.85)",
    },
    "IRA": {
        "fill": "rgba(147, 141, 194, 0.55)",  # Soft lavender - traditional IRA
        "line": "rgba(147, 141, 194, 0.85)",
    },
    "HSA": {
        "fill": "rgba(99, 179, 171, 0.55)",  # Teal - triple tax advantage
        "line": "rgba(99, 179, 171, 0.85)",
    },
    "Roth IRA": {
        "fill": "rgba(176, 147, 182, 0.55)",  # Dusty mauve - tax-free growth
        "line": "rgba(176, 147, 182, 0.85)",
    },
}

# Solid legend colors (for legend swatches)
ACCOUNT_COLORS = {
    "HYSA": "#FBBF72",
    "Coinbase": "#F59E59",
    "Taxable Brokerage": "#86B69F",
    "401k": "#74A5C1",
    "IRA": "#938DC2",
    "HSA": "#63B3AB",
    "Roth IRA": "#B093B6",
}


def create_drawdown_chart(data: FinanceData, fire_goal: Decimal) -> dcc.Graph:
    """Create stacked area chart showing portfolio balance by account type during retirement."""
    drawdown_df = get_retirement_drawdown_series(data, fire_goal=fire_goal)

    fig = go.Figure()

    # Extract data for hover display
    ages = drawdown_df["Age"].to_list()
    withdrawals = [float(w) for w in drawdown_df["Withdrawal"].to_list()]
    total_balances = [float(t) for t in drawdown_df["Total_Balance"].to_list()]

    # Add stacked areas for each account type (in reverse order so first depleted is on top)
    for account_type in reversed(WITHDRAWAL_ORDER):
        balances = [float(b) for b in drawdown_df[account_type].to_list()]
        palette = ACCOUNT_PALETTE[account_type]
        fig.add_trace(
            go.Scatter(
                x=ages,
                y=balances,
                mode="lines",
                name=account_type,
                stackgroup="one",
                line={"width": 1.5, "color": palette["line"]},
                fillcolor=palette["fill"],
                hovertemplate="$%{y:,.0f}",
            )
        )

    # Add invisible trace for total balance and withdrawal in unified hover
    fig.add_trace(
        go.Scatter(
            x=ages,
            y=total_balances,
            mode="lines",
            name="Total",
            line={"width": 0, "color": "rgba(0,0,0,0)"},
            customdata=withdrawals,
            hovertemplate="<b>Total: $%{y:,.0f}</b><br>Withdrawal: $%{customdata:,.0f}",
            showlegend=False,
        )
    )

    fig.update_layout(
        title={"text": "Portfolio Balance During Retirement", "y": 0.98, "yanchor": "top"},
        xaxis_title="Age",
        yaxis_title="",
        yaxis_tickprefix="$",
        template=CHART_TEMPLATE,
        height=450,
        margin={"t": 80},
        showlegend=True,
        legend={"orientation": "h", "yanchor": "top", "y": 1.12, "xanchor": "left", "x": 0},
        hovermode="x unified",
    )

    return dcc.Graph(figure=fig, config={"displayModeBar": False})


def create_withdrawal_chart(data: FinanceData, fire_goal: Decimal) -> dcc.Graph:
    """Create stacked bar chart showing annual withdrawals by account type."""
    drawdown_df = get_retirement_drawdown_series(data, fire_goal=fire_goal)

    ages = drawdown_df["Age"].to_list()
    withdrawals_by_account: dict[str, list[float]] = {}

    # Use the pre-computed per-account withdrawal columns
    for acct in WITHDRAWAL_ORDER:
        withdrawals_by_account[acct] = [float(w) for w in drawdown_df[f"{acct}_Withdrawal"].to_list()]

    fig = go.Figure()

    # Add stacked bars for each account type
    for account_type in WITHDRAWAL_ORDER:
        palette = ACCOUNT_PALETTE[account_type]
        fig.add_trace(
            go.Bar(
                x=ages,
                y=withdrawals_by_account[account_type],
                name=account_type,
                marker={
                    "color": palette["fill"],
                    "line": {"width": 1, "color": palette["line"]},
                },
                hovertemplate=f"{account_type}: $%{{y:,.0f}}<extra></extra>",
            )
        )

    fig.update_layout(
        title={"text": "Annual Retirement Income by Source", "y": 0.98, "yanchor": "top"},
        xaxis_title="Age",
        yaxis_title="",
        yaxis_tickprefix="$",
        barmode="stack",
        template=CHART_TEMPLATE,
        height=450,
        margin={"t": 80},
        showlegend=True,
        legend={"orientation": "h", "yanchor": "top", "y": 1.12, "xanchor": "left", "x": 0},
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
            create_fire_metrics_row(
                fire_number=FIRE_GOAL,
                runway_years=runway_years,
                fire_date_str=fire_date_str,
                years_to_fire_str=years_to_fire_str,
            ),
            # Drawdown visualizations stacked vertically
            html.Div(
                style=STYLES["chart_container"],
                children=[create_drawdown_chart(data, FIRE_GOAL)],
            ),
            html.Div(
                style=STYLES["chart_container"],
                children=[create_withdrawal_chart(data, FIRE_GOAL)],
            ),
        ],
    )
