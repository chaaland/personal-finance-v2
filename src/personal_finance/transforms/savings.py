"""Savings rate calculations."""

import polars as pl

from personal_finance.data.loader import FinanceData
from personal_finance.transforms.income import get_take_home_by_year
from personal_finance.transforms.spending import get_combined_spending


def get_annual_spending(data: FinanceData) -> pl.DataFrame:
    """Get total spending per year.

    Returns DataFrame with columns: Year, Spend_USD
    """
    combined = get_combined_spending(data)

    yearly = (
        combined.with_columns(pl.col("Dates").dt.year().alias("Year"))
        .group_by("Year")
        .agg(pl.col("Total_USD").sum().alias("Spend_USD"))
    )

    return yearly.sort("Year")


def get_savings_rate_by_year(data: FinanceData) -> pl.DataFrame:
    """Calculate savings rate per year.

    Formula: (take_home - spend) / take_home

    Returns DataFrame with columns: Year, Savings_Rate
    """
    take_home = get_take_home_by_year(data)
    spending = get_annual_spending(data)

    # Join on year
    combined = take_home.join(spending, on="Year", how="left").with_columns(pl.col("Spend_USD").fill_null(0))

    # Calculate savings rate
    combined = combined.with_columns(
        ((pl.col("Take_Home_USD") - pl.col("Spend_USD")) / pl.col("Take_Home_USD") * 100).alias("Savings_Rate")
    )

    return combined.select("Year", "Savings_Rate").sort("Year")


def get_current_year_savings_rate(data: FinanceData) -> float:
    """Get savings rate for the current year so far.

    Uses the most recent date in the data as the "current" date.
    """
    # Use the most recent date in the spending data as "current"
    combined = get_combined_spending(data)
    most_recent_date = combined.select("Dates").row(-1)[0]
    current_year = most_recent_date.year

    rates = get_savings_rate_by_year(data)
    current = rates.filter(pl.col("Year") == current_year)

    if current.is_empty():
        return 0.0

    return current.select("Savings_Rate").row(0)[0] or 0.0
