"""Spending calculations and transformations."""

from datetime import datetime

import polars as pl

from personal_finance.data.loader import FinanceData


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


def get_ytd_spending(data: FinanceData) -> float:
    """Get year-to-date spending total in USD."""
    combined = get_combined_spending(data)
    current_year = datetime.now().year

    ytd = combined.filter(pl.col("Dates").dt.year() == current_year)
    return ytd.select(pl.col("Total_USD").sum()).row(0)[0] or 0.0


def get_projected_annual_spend(data: FinanceData) -> float:
    """Get projected annual spend based on YTD spending.

    Formula: (YTD spend) * (12 / months_elapsed)
    """
    current_date = datetime.now()
    months_elapsed = current_date.month

    ytd_spend = get_ytd_spending(data)

    if months_elapsed == 0:
        return 0.0

    return ytd_spend * (12 / months_elapsed)


def get_previous_year_spending(data: FinanceData) -> float:
    """Get total spending for the previous full year."""
    combined = get_combined_spending(data)
    previous_year = datetime.now().year - 1

    prev_year_data = combined.filter(pl.col("Dates").dt.year() == previous_year)
    return prev_year_data.select(pl.col("Total_USD").sum()).row(0)[0] or 0.0


def get_yoy_spending_comparison(data: FinanceData) -> tuple[float, float]:
    """Compare projected current year spend to previous year.

    Returns:
        Tuple of (absolute_difference, percentage_difference)
    """
    projected = get_projected_annual_spend(data)
    previous = get_previous_year_spending(data)

    if previous == 0:
        return projected, 0.0

    absolute_diff = projected - previous
    percentage_diff = (absolute_diff / previous) * 100

    return absolute_diff, percentage_diff
