"""Spending calculations and transformations.

Uses Decimal types for all currency calculations.
"""

from datetime import timedelta
from decimal import Decimal

import polars as pl

from personal_finance.data.loader import CURRENCY_DTYPE, FinanceData


def get_combined_spending(data: FinanceData) -> pl.DataFrame:
    """Combine US and UK spending into single DataFrame with USD values.

    Returns DataFrame with columns: Dates, Total_USD
    """
    us = data.us_spend.select(
        pl.col("Dates"),
        (pl.col("Total") * pl.col("Conversion")).alias("USD"),
    )

    uk = data.uk_spend.select(
        pl.col("Dates"),
        (pl.col("Total") * pl.col("Conversion")).alias("USD"),
    )

    # Concatenate and aggregate by date
    combined = pl.concat([us, uk]).group_by("Dates").agg(pl.col("USD").sum().alias("Total_USD"))

    return combined.sort("Dates")


def get_monthly_spending(data: FinanceData) -> pl.DataFrame:
    """Get monthly spending totals in USD."""
    return get_combined_spending(data)


def get_monthly_spending_with_median(data: FinanceData, window_days: int = 120) -> pl.DataFrame:
    """Get monthly spending with rolling median.

    Args:
        data: Finance data
        window_days: Rolling window size in days (default 120, ~4 months)

    Returns DataFrame with columns: Dates, Total_USD, Median_USD
    """
    df = get_combined_spending(data)

    # Use rolling_median with time-based window
    df = df.with_columns(
        pl.col("Total_USD")
        .rolling_median_by("Dates", window_size=timedelta(days=window_days), closed="both")
        .alias("Median_USD")
    )

    return df


def get_ytd_spending(data: FinanceData) -> Decimal:
    """Get year-to-date spending total in USD.

    Uses the most recent date in the data as the "current" date.
    """
    combined = get_combined_spending(data)

    # Use the most recent date in the data as "current"
    most_recent_date = combined.select("Dates").row(-1)[0]
    current_year = most_recent_date.year

    ytd = combined.filter(pl.col("Dates").dt.year() == current_year)
    return ytd.select(pl.col("Total_USD").sum()).row(0)[0] or Decimal("0")


def get_projected_annual_spend(data: FinanceData) -> Decimal:
    """Get projected annual spend based on YTD spending.

    Uses the most recent date in the data as the "current" date.
    Formula: (YTD spend) * (12 / months_elapsed)
    """
    combined = get_combined_spending(data)

    # Use the most recent date in the data as "current"
    most_recent_date = combined.select("Dates").row(-1)[0]
    months_elapsed = most_recent_date.month

    ytd_spend = get_ytd_spending(data)

    if months_elapsed == 0:
        return Decimal("0")

    return ytd_spend * Decimal(12) / Decimal(months_elapsed)


def get_previous_year_spending(data: FinanceData) -> Decimal:
    """Get total spending for the previous full year.

    Uses the most recent date in the data as the "current" date.
    """
    combined = get_combined_spending(data)

    # Use the most recent date in the data as "current"
    most_recent_date = combined.select("Dates").row(-1)[0]
    previous_year = most_recent_date.year - 1

    prev_year_data = combined.filter(pl.col("Dates").dt.year() == previous_year)
    return prev_year_data.select(pl.col("Total_USD").sum()).row(0)[0] or Decimal("0")


def get_yoy_spending_comparison(data: FinanceData) -> tuple[Decimal, Decimal]:
    """Compare projected current year spend to previous year.

    Returns:
        Tuple of (absolute_difference, percentage_difference)
    """
    projected = get_projected_annual_spend(data)
    previous = get_previous_year_spending(data)

    if previous == 0:
        return projected, Decimal("0")

    absolute_diff = projected - previous
    percentage_diff = (absolute_diff / previous) * Decimal(100)

    return absolute_diff, percentage_diff
