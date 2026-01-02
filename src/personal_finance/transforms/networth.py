"""Net worth calculations and transformations.

Uses Decimal types for all currency calculations.
"""

from decimal import Decimal

import polars as pl

from personal_finance.data.loader import CURRENCY_DTYPE, FinanceData


def get_combined_networth(data: FinanceData) -> pl.DataFrame:
    """Combine US and UK net worth into single DataFrame with USD values.

    Uses forward-fill interpolation to handle misaligned dates between US and UK data.
    This prevents jagged lines in charts when record-keeping dates don't match exactly.

    Returns DataFrame with columns: Dates, US_USD, UK_USD, Total_USD
    """
    us = data.us_networth.select(
        pl.col("Dates"),
        (pl.col("Net") * pl.col("Conversion")).alias("US_USD"),
    ).sort("Dates")

    uk = data.uk_networth.select(
        pl.col("Dates"),
        (pl.col("Net") * pl.col("Conversion")).alias("UK_USD"),
    ).sort("Dates")

    # Get all unique dates from both datasets
    all_dates = pl.concat([us.select("Dates"), uk.select("Dates")]).unique().sort("Dates")

    # Use join_asof to forward-fill values from the most recent prior date
    # strategy="backward" means: for each date, find the nearest prior (or equal) date
    combined = all_dates.join_asof(us, on="Dates", strategy="backward").join_asof(uk, on="Dates", strategy="backward")

    # Fill any remaining nulls (dates before first record) with 0
    combined = combined.with_columns(
        pl.col("US_USD").fill_null(pl.lit(Decimal("0")).cast(CURRENCY_DTYPE)),
        pl.col("UK_USD").fill_null(pl.lit(Decimal("0")).cast(CURRENCY_DTYPE)),
    )

    # Calculate total
    combined = combined.with_columns((pl.col("US_USD") + pl.col("UK_USD")).alias("Total_USD"))

    return combined.sort("Dates")


def get_current_networth(data: FinanceData) -> Decimal:
    """Get the most recent total net worth in USD."""
    combined = get_combined_networth(data)
    return combined.select("Total_USD").row(-1)[0]


def get_ytd_networth_change(data: FinanceData) -> tuple[Decimal, Decimal]:
    """Get year-to-date net worth change.

    Uses the most recent date in the data as the "current" date.
    In January (when only one data point exists for the year), compares against
    the last value from December of the previous year for a more useful comparison.

    Returns:
        Tuple of (absolute_change, percentage_change)
    """
    combined = get_combined_networth(data)

    # Use the most recent date in the data as "current"
    most_recent_date = combined.select("Dates").row(-1)[0]
    current_year = most_recent_date.year
    current_value = combined.select("Total_USD").row(-1)[0]

    # Get data for current year
    year_data = combined.filter(pl.col("Dates").dt.year() == current_year).sort("Dates")

    if year_data.is_empty():
        return Decimal("0"), Decimal("0")

    # If we only have one data point this year (January), compare against December
    if len(year_data) == 1:
        prev_year_data = combined.filter(pl.col("Dates").dt.year() == current_year - 1).sort("Dates")
        if prev_year_data.is_empty():
            return Decimal("0"), Decimal("0")
        start_value = prev_year_data.select("Total_USD").row(-1)[0]  # Last value of previous year
    else:
        start_value = year_data.select("Total_USD").row(0)[0]  # First value of current year

    absolute_change = current_value - start_value
    percentage_change = (absolute_change / start_value) * Decimal(100) if start_value != 0 else Decimal("0")

    return absolute_change, percentage_change


def get_yoy_networth_changes(data: FinanceData) -> pl.DataFrame:
    """Get year-over-year net worth changes.

    Returns DataFrame with columns: Year, Start_Value, End_Value, Change, Change_Pct
    """
    combined = get_combined_networth(data)

    # Add year column
    combined = combined.with_columns(pl.col("Dates").dt.year().alias("Year"))

    # Get first and last value per year
    yearly = combined.group_by("Year").agg(
        pl.col("Total_USD").first().alias("Start_Value"),
        pl.col("Total_USD").last().alias("End_Value"),
    )

    yearly = yearly.with_columns(
        (pl.col("End_Value") - pl.col("Start_Value")).alias("Change"),
        ((pl.col("End_Value") - pl.col("Start_Value")) / pl.col("Start_Value") * 100).alias("Change_Pct"),
    )

    return yearly.sort("Year")
