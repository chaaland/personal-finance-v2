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
        ],
    )
