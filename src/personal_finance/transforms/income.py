"""Income/compensation calculations and transformations.

Uses Decimal types for all currency calculations.
"""

from decimal import Decimal

import polars as pl

from personal_finance.data.loader import CURRENCY_DTYPE, FinanceData


def get_income_by_year(data: FinanceData) -> pl.DataFrame:
    """Get gross and net income per year in USD.

    Returns DataFrame with columns: Year, Gross_USD, Net_USD
    """
    comp = data.total_comp.with_columns(
        pl.col("Dates").dt.year().alias("Year"),
        (pl.col("Gross") * pl.col("Conversion")).alias("Gross_USD"),
        (pl.col("Net") * pl.col("Conversion")).alias("Net_USD"),
    )

    yearly = comp.group_by("Year").agg(
        pl.col("Gross_USD").sum().alias("Gross_USD"),
        pl.col("Net_USD").sum().alias("Net_USD"),
    )

    return yearly.sort("Year")


def get_ytd_gross_income(data: FinanceData) -> Decimal:
    """Get year-to-date gross income in USD.

    Uses the most recent date in the data as the "current" date.
    """
    # Use the most recent date in the data as "current"
    most_recent_date = data.total_comp.select("Dates").sort("Dates").row(-1)[0]
    current_year = most_recent_date.year

    ytd = data.total_comp.filter(pl.col("Dates").dt.year() == current_year)

    if ytd.is_empty():
        return Decimal("0")

    return ytd.select((pl.col("Gross") * pl.col("Conversion")).sum()).row(0)[0] or Decimal("0")


def get_ytd_net_income(data: FinanceData) -> Decimal:
    """Get year-to-date net income in USD.

    Uses the most recent date in the data as the "current" date.
    """
    # Use the most recent date in the data as "current"
    most_recent_date = data.total_comp.select("Dates").sort("Dates").row(-1)[0]
    current_year = most_recent_date.year

    ytd = data.total_comp.filter(pl.col("Dates").dt.year() == current_year)

    if ytd.is_empty():
        return Decimal("0")

    return ytd.select((pl.col("Net") * pl.col("Conversion")).sum()).row(0)[0] or Decimal("0")


def get_yoy_income_comparison(data: FinanceData) -> tuple[Decimal, Decimal]:
    """Compare YTD gross income to same period last year.

    Returns:
        Tuple of (absolute_difference, percentage_difference)
    """
    dates_col = pl.col("Dates")
    gross_usd_col = pl.col("Gross") * pl.col("Conversion")

    most_recent_date = data.total_comp.select("Dates").sort("Dates").row(-1)[0]
    current_year = most_recent_date.year

    ytd_current = get_ytd_gross_income(data)

    # Get income for same period last year (up to same month)
    prev_year_df = data.total_comp.filter(
        (dates_col.dt.year() == current_year - 1) & (dates_col.dt.month() <= most_recent_date.month)
    )

    if prev_year_df.is_empty():
        return ytd_current, Decimal("0")

    ytd_previous = prev_year_df.select(gross_usd_col.sum()).row(0)[0] or Decimal("0")

    if ytd_previous == 0:
        return ytd_current, Decimal("0")

    absolute_diff = ytd_current - ytd_previous
    percentage_diff = (absolute_diff / ytd_previous) * Decimal(100)

    return absolute_diff, percentage_diff


def get_take_home_by_year(data: FinanceData) -> pl.DataFrame:
    """Get take-home pay (Net + Pension Contrib) per year in USD.

    Returns DataFrame with columns: Year, Take_Home_USD
    """
    comp = data.total_comp.with_columns(
        pl.col("Dates").dt.year().alias("Year"),
        ((pl.col("Net") + pl.col("Pension Contrib")) * pl.col("Conversion")).alias("Take_Home_USD"),
    )

    yearly = comp.group_by("Year").agg(pl.col("Take_Home_USD").sum().alias("Take_Home_USD"))

    return yearly.sort("Year")
