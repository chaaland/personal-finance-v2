"""FIRE (Financial Independence, Retire Early) calculations.

Uses Decimal types for all currency calculations.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import NamedTuple

import polars as pl

from personal_finance.data.loader import FinanceData
from personal_finance.transforms.networth import get_combined_networth, get_current_networth
from personal_finance.transforms.spending import get_projected_annual_spend


class FireProjection(NamedTuple):
    """Result of FIRE projection calculation."""

    fire_date: datetime | None  # None if already FIRE or can't project
    years_to_fire: Decimal | None
    annual_nw_growth: Decimal


def get_fire_number(data: FinanceData, withdrawal_rate: Decimal = Decimal("0.04")) -> Decimal:
    """Calculate FIRE number based on projected annual spending and withdrawal rate.

    FIRE number = projected_annual_spend / withdrawal_rate

    Args:
        data: Finance data
        withdrawal_rate: Safe withdrawal rate as decimal (e.g., 0.04 for 4%)

    Returns:
        FIRE number in USD
    """
    projected_spend = get_projected_annual_spend(data)
    if withdrawal_rate == 0:
        return Decimal("0")
    return projected_spend / withdrawal_rate


def get_fire_progress_pct(data: FinanceData, fire_goal: Decimal) -> Decimal:
    """Calculate percentage progress toward FIRE goal.

    Args:
        data: Finance data
        fire_goal: Target FIRE number in USD

    Returns:
        Progress percentage (e.g., 42.5 for 42.5%)
    """
    if fire_goal == 0:
        return Decimal("0")
    current_nw = get_current_networth(data)
    return (current_nw / fire_goal) * Decimal("100")


def get_current_runway_years(data: FinanceData) -> Decimal:
    """Calculate how many years current net worth would last at projected spending.

    Args:
        data: Finance data

    Returns:
        Years of runway
    """
    current_nw = get_current_networth(data)
    projected_spend = get_projected_annual_spend(data)
    if projected_spend == 0:
        return Decimal("0")
    return current_nw / projected_spend


def get_annual_nw_growth(data: FinanceData, lookback_years: int = 3) -> Decimal:
    """Calculate average annual net worth growth over lookback period.

    Uses simple slope calculation: (end_value - start_value) / years_elapsed

    Args:
        data: Finance data
        lookback_years: Number of years to look back

    Returns:
        Average annual growth in USD
    """
    combined_df = get_combined_networth(data)
    if combined_df.is_empty():
        return Decimal("0")

    most_recent_date = combined_df.select("Dates").row(-1)[0]
    cutoff_date = most_recent_date.replace(year=most_recent_date.year - lookback_years)

    # Filter to lookback period
    period_df = combined_df.filter(pl.col("Dates") >= cutoff_date).sort("Dates")

    if len(period_df) < 2:
        return Decimal("0")

    start_value = period_df.select("Total_USD").row(0)[0]
    end_value = period_df.select("Total_USD").row(-1)[0]
    start_date = period_df.select("Dates").row(0)[0]
    end_date = period_df.select("Dates").row(-1)[0]

    # Calculate actual years elapsed
    days_elapsed = (end_date - start_date).days
    if days_elapsed == 0:
        return Decimal("0")

    years_elapsed = Decimal(str(days_elapsed)) / Decimal("365.25")
    if years_elapsed == 0:
        return Decimal("0")

    return (end_value - start_value) / years_elapsed


def get_projected_fire_date(
    data: FinanceData,
    fire_goal: Decimal,
    lookback_years: int = 3,
) -> FireProjection:
    """Project when FIRE will be achieved based on historical growth.

    Args:
        data: Finance data
        fire_goal: Target FIRE number in USD
        lookback_years: Years of history to use for growth calculation

    Returns:
        FireProjection with date, years to FIRE, and annual growth
    """
    fire_number = fire_goal
    current_nw = get_current_networth(data)
    annual_growth = get_annual_nw_growth(data, lookback_years)

    # Already at FIRE
    if current_nw >= fire_number:
        return FireProjection(fire_date=None, years_to_fire=Decimal("0"), annual_nw_growth=annual_growth)

    # No growth or negative growth - can't project
    if annual_growth <= 0:
        return FireProjection(fire_date=None, years_to_fire=None, annual_nw_growth=annual_growth)

    # Calculate years to FIRE
    gap = fire_number - current_nw
    years_to_fire = gap / annual_growth

    # Get most recent date and add years
    combined_df = get_combined_networth(data)
    most_recent_date = combined_df.select("Dates").row(-1)[0]

    # Calculate projected date
    days_to_add = int(float(years_to_fire) * 365.25)
    fire_date = most_recent_date + timedelta(days=days_to_add)

    return FireProjection(fire_date=fire_date, years_to_fire=years_to_fire, annual_nw_growth=annual_growth)


def get_fire_projection_series(
    data: FinanceData,
    fire_goal: Decimal,
    lookback_years: int = 3,
    projection_years: int = 2,
) -> tuple[pl.DataFrame, pl.DataFrame, Decimal]:
    """Get historical and projected net worth series for charting.

    Args:
        data: Finance data
        fire_goal: Target FIRE number in USD
        lookback_years: Years of history for growth calculation
        projection_years: Years to project into future

    Returns:
        Tuple of (historical_df, projection_df, fire_number)
        - historical_df: Dates, Total_USD columns
        - projection_df: Dates, Total_USD columns (projected values)
        - fire_number: The FIRE target
    """
    from personal_finance.data.loader import CURRENCY_DTYPE

    historical_df = get_combined_networth(data).select("Dates", "Total_USD")
    fire_number = fire_goal
    annual_growth = get_annual_nw_growth(data, lookback_years)

    if historical_df.is_empty():
        empty_df = pl.DataFrame({"Dates": [], "Total_USD": []})
        return empty_df, empty_df, fire_number

    # Get current values
    most_recent_date = historical_df.select("Dates").row(-1)[0]
    current_nw = historical_df.select("Total_USD").row(-1)[0]

    # Create projection points (monthly for smooth line)
    months_to_project = projection_years * 12
    projection_dates = []
    projection_values = []

    for month in range(1, months_to_project + 1):
        proj_date = most_recent_date + timedelta(days=month * 30)
        years_elapsed = Decimal(str(month)) / Decimal("12")
        proj_value = current_nw + (annual_growth * years_elapsed)
        projection_dates.append(proj_date)
        projection_values.append(proj_value)

    projection_df = pl.DataFrame(
        {
            "Dates": projection_dates,
            "Total_USD": projection_values,
        }
    ).with_columns(pl.col("Total_USD").cast(CURRENCY_DTYPE))

    return historical_df, projection_df, fire_number
