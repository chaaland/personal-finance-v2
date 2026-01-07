"""Summary tab component."""

from dash import html

from personal_finance.components.cards import expandable_metric_card, fire_date_card, fire_progress_card
from personal_finance.components.fire import FIRE_GOAL
from personal_finance.data.loader import FinanceData
from personal_finance.theme import STYLES, format_currency
from personal_finance.transforms import (
    get_current_networth,
    get_current_runway_years,
    get_current_year_savings_rate,
    get_fire_progress_pct,
    get_projected_annual_spend,
    get_projected_fire_date,
    get_savings_rate_details,
    get_spending_projection_details,
    get_yoy_income_comparison,
    get_yoy_spending_comparison,
    get_ytd_gross_income,
    get_ytd_income_details,
    get_ytd_networth_change,
    get_ytd_networth_details,
)


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
    )
