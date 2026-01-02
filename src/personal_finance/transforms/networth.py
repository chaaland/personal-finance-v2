"""Net worth calculations and transformations."""

import polars as pl

from personal_finance.data.loader import FinanceData


def get_combined_networth(data: FinanceData) -> pl.DataFrame:
    """Combine US and UK net worth into single DataFrame with USD values.

    Returns DataFrame with columns: Dates, US_USD, UK_USD, Total_USD
    """
    us = data.us_networth.select(
        pl.col("Dates"),
        (pl.col("Net") * pl.col("Conversion")).alias("US_USD"),
    )

    uk = data.uk_networth.select(
        pl.col("Dates"),
        (pl.col("Net") * pl.col("Conversion")).alias("UK_USD"),
    )

    # Join on dates, filling missing values with 0
    combined = us.join(uk, on="Dates", how="outer_coalesce").with_columns(
        pl.col("US_USD").fill_null(0),
        pl.col("UK_USD").fill_null(0),
    )

    # Calculate total
    combined = combined.with_columns((pl.col("US_USD") + pl.col("UK_USD")).alias("Total_USD"))

    return combined.sort("Dates")


def get_current_networth(data: FinanceData) -> float:
    """Get the most recent total net worth in USD."""
    combined = get_combined_networth(data)
    return combined.select("Total_USD").row(-1)[0]


def get_ytd_networth_change(data: FinanceData) -> tuple[float, float]:
    """Get year-to-date net worth change.

    Uses the most recent date in the data as the "current" date.

    Returns:
        Tuple of (absolute_change, percentage_change)
    """
    combined = get_combined_networth(data)

    # Use the most recent date in the data as "current"
    most_recent_date = combined.select("Dates").row(-1)[0]
    current_year = most_recent_date.year

    # Get first value of current year
    year_start = combined.filter(pl.col("Dates").dt.year() == current_year).sort("Dates")

    if year_start.is_empty():
        return 0.0, 0.0

    start_value = year_start.select("Total_USD").row(0)[0]
    current_value = combined.select("Total_USD").row(-1)[0]

    absolute_change = current_value - start_value
    percentage_change = (absolute_change / start_value) * 100 if start_value != 0 else 0.0

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
