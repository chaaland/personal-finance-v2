"""Income/compensation calculations and transformations."""

from datetime import datetime

import polars as pl

from personal_finance.data.loader import FinanceData


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


def get_ytd_gross_income(data: FinanceData) -> float:
    """Get year-to-date gross income in USD."""
    current_year = datetime.now().year

    ytd = data.total_comp.filter(pl.col("Dates").dt.year() == current_year)

    if ytd.is_empty():
        return 0.0

    return ytd.select((pl.col("Gross") * pl.col("Conversion")).sum()).row(0)[0] or 0.0


def get_ytd_net_income(data: FinanceData) -> float:
    """Get year-to-date net income in USD."""
    current_year = datetime.now().year

    ytd = data.total_comp.filter(pl.col("Dates").dt.year() == current_year)

    if ytd.is_empty():
        return 0.0

    return ytd.select((pl.col("Net") * pl.col("Conversion")).sum()).row(0)[0] or 0.0


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
