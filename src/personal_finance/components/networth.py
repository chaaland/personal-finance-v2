"""Net worth tab component."""

import plotly.graph_objects as go
import polars as pl
from dash import dcc, html

from personal_finance.components.cards import metric_card
from personal_finance.components.fire import FIRE_GOAL
from personal_finance.data.loader import FinanceData
from personal_finance.theme import CHART_TEMPLATE, COLORS, FONTS, STYLES
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
            fillcolor="rgba(212, 168, 83, 0.12)",  # Gold fill for dark mode
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
    yoy_df = get_yoy_networth_changes(data)

    colors = [COLORS["positive"] if c >= 0 else COLORS["negative"] for c in yoy_df["Change"].to_list()]

    fig = go.Figure(
        go.Bar(
            x=yoy_df["Year"].to_list(),
            y=yoy_df["Change"].to_list(),
            marker_color=colors,
            text=[f"${c / 1000:+,.0f}K" for c in yoy_df["Change"].to_list()],
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


# Color palette for pie/donut charts - muted, sophisticated tones
CHART_COLORS = [
    COLORS["chart_1"],  # Burnished gold
    COLORS["chart_2"],  # Slate blue
    COLORS["chart_3"],  # Sage green
    COLORS["chart_4"],  # Terracotta
    "#9F8AC4",  # Muted lavender
    "#C98BA3",  # Dusty rose
    "#6BA3A3",  # Muted teal
    "#8B9CAE",  # Cool slate
    "#C9A86A",  # Muted ochre
]


def _prepare_asset_allocation_df(data: FinanceData, region: str) -> pl.DataFrame:
    """Prepare asset allocation DataFrame for the specified region.

    Args:
        data: Finance data containing US and UK asset allocations.
        region: One of "US", "UK", or "All".

    Returns:
        DataFrame with columns: Asset, Value (in USD), Account Type
    """
    value_col = pl.col("Value")
    conversion_col = pl.col("Conversion")

    if region == "US":
        return data.us_asset_allocation
    elif region == "UK":
        # Convert UK values from GBP to USD using the Conversion column
        return data.uk_asset_allocation.with_columns((value_col * conversion_col).alias("Value")).select(
            ["Asset", "Value", "Account Type"]
        )
    else:  # "All"
        us_df = data.us_asset_allocation
        uk_usd_df = data.uk_asset_allocation.with_columns((value_col * conversion_col).alias("Value")).select(
            ["Asset", "Value", "Account Type"]
        )
        return pl.concat([us_df, uk_usd_df])


def _create_allocation_donut_chart(
    data: FinanceData,
    region: str,
    group_by: str,
    title: str,
) -> go.Figure:
    """Create asset allocation donut chart grouped by specified column.

    Args:
        data: Finance data containing asset allocations.
        region: One of "US", "UK", or "All".
        group_by: Column name to group by ("Asset" or "Account Type").
        title: Chart title.

    Returns:
        Plotly donut chart figure.
    """
    alloc_df = _prepare_asset_allocation_df(data, region)

    value_col = pl.col("Value")
    grouped_df = alloc_df.group_by(group_by).agg(value_col.sum()).sort("Value", descending=True)

    labels = grouped_df[group_by].to_list()
    values = grouped_df["Value"].to_list()

    fig = go.Figure(
        go.Pie(
            labels=labels,
            values=values,
            hole=0.55,
            marker={"colors": CHART_COLORS[: len(labels)]},
            textinfo="label+percent",
            textposition="outside",
            textfont={"size": 10, "color": COLORS["text_secondary"]},
            hovertemplate="<b>%{label}</b><br>$%{value:,.0f}<br>%{percent}<extra></extra>",
            pull=[0.02] * len(labels),
        )
    )

    fig.update_layout(
        title=title,
        template=CHART_TEMPLATE,
        showlegend=False,
        margin={"t": 60, "r": 60, "b": 40, "l": 60},
    )

    return fig


def create_asset_by_stock_chart(data: FinanceData, region: str = "US") -> go.Figure:
    """Create asset allocation donut chart broken down by stock/asset.

    Args:
        data: Finance data containing asset allocations.
        region: One of "US", "UK", or "All". Defaults to "US".

    Returns:
        Plotly donut chart figure.
    """
    return _create_allocation_donut_chart(data, region, "Asset", "By Stock")


def create_asset_by_account_type_chart(data: FinanceData, region: str = "US") -> go.Figure:
    """Create asset allocation donut chart broken down by account type.

    Args:
        data: Finance data containing asset allocations.
        region: One of "US", "UK", or "All". Defaults to "US".

    Returns:
        Plotly donut chart figure.
    """
    return _create_allocation_donut_chart(data, region, "Account Type", "By Account Type")


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
            # Asset Allocation - full width with two donut charts side by side
            html.Div(
                style={
                    **STYLES["chart_container"],
                    "display": "flex",
                    "flexDirection": "column",
                },
                children=[
                    # Header row with title and region selector
                    html.Div(
                        style={
                            "display": "flex",
                            "justifyContent": "space-between",
                            "alignItems": "center",
                            "marginBottom": "16px",
                        },
                        children=[
                            html.H3(
                                "Asset Allocation",
                                style={
                                    "fontFamily": FONTS["display"],
                                    "fontSize": "20px",
                                    "color": COLORS["text_primary"],
                                    "margin": "0",
                                },
                            ),
                            # Segmented button for region selection (styled via CSS)
                            dcc.RadioItems(
                                id="asset-allocation-region-selector",
                                options=[
                                    {"label": "US", "value": "US"},
                                    {"label": "UK", "value": "UK"},
                                    {"label": "All", "value": "All"},
                                ],
                                value="US",
                                inline=True,
                                className="segmented-button",
                                inputStyle={"display": "none"},
                            ),
                        ],
                    ),
                    # Charts row
                    html.Div(
                        style={"display": "flex", "gap": "8px"},
                        children=[
                            html.Div(
                                style={"flex": "1"},
                                children=[
                                    dcc.Graph(
                                        id="asset-by-stock-chart",
                                        figure=create_asset_by_stock_chart(data, "US"),
                                        config={"displayModeBar": False},
                                    )
                                ],
                            ),
                            html.Div(
                                style={"flex": "1"},
                                children=[
                                    dcc.Graph(
                                        id="asset-by-account-type-chart",
                                        figure=create_asset_by_account_type_chart(data, "US"),
                                        config={"displayModeBar": False},
                                    )
                                ],
                            ),
                        ],
                    ),
                ],
            ),
            # YoY change chart
            html.Div(
                style=STYLES["chart_container"],
                children=[dcc.Graph(figure=create_yoy_networth_chart(data), config={"displayModeBar": False})],
            ),
        ]
    )
