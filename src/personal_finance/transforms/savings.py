"""Savings rate calculations.

Uses Decimal types for all currency calculations.
"""

from decimal import Decimal

import polars as pl

from personal_finance.data.loader import CURRENCY_DTYPE, FinanceData
from personal_finance.transforms.income import get_take_home_by_year
from personal_finance.transforms.spending import get_combined_spending


def get_annual_spending(data: FinanceData) -> pl.DataFrame:
    """Get total spending per year.

    Returns DataFrame with columns: Year, Spend_USD
    """
    combined_df = get_combined_spending(data)

    yearly_df = (
        combined_df.with_columns(pl.col("Dates").dt.year().alias("Year"))
        .group_by("Year")
        .agg(pl.col("Total_USD").sum().alias("Spend_USD"))
    )

    return yearly_df.sort("Year")


def get_savings_rate_by_year(data: FinanceData) -> pl.DataFrame:
    """Calculate savings rate per year.

    Formula: (take_home - spend) / take_home

    Returns DataFrame with columns: Year, Savings_Rate
    """
    take_home_df = get_take_home_by_year(data)
    spending_df = get_annual_spending(data)

    # Join on year
    combined_df = take_home_df.join(spending_df, on="Year", how="left").with_columns(
        pl.col("Spend_USD").fill_null(pl.lit(Decimal("0")).cast(CURRENCY_DTYPE))
    )

    # Calculate savings rate
    combined_df = combined_df.with_columns(
        ((pl.col("Take_Home_USD") - pl.col("Spend_USD")) / pl.col("Take_Home_USD") * 100).alias("Savings_Rate")
    )

    return combined_df.select("Year", "Savings_Rate").sort("Year")


def get_current_year_savings_rate(data: FinanceData) -> Decimal:
    """Get savings rate for the current year so far.

    Uses the most recent date in the data as the "current" date.
    """
    # Use the most recent date in the spending data as "current"
    combined_df = get_combined_spending(data)
    most_recent_date = combined_df.select("Dates").row(-1)[0]
    current_year = most_recent_date.year

    rates_df = get_savings_rate_by_year(data)
    current_df = rates_df.filter(pl.col("Year") == current_year)

    if current_df.is_empty():
        return Decimal("0")

    return current_df.select("Savings_Rate").row(0)[0] or Decimal("0")


class SavingsRateDetails:
    """Details about YoY savings rate comparison for display."""

    def __init__(
        self,
        current_rate: Decimal,
        current_year: int,
        previous_rate: Decimal,
        previous_year: int,
        change: Decimal,
    ):
        self.current_rate = current_rate
        self.current_year = current_year
        self.previous_rate = previous_rate
        self.previous_year = previous_year
        self.change = change

    def format_explanation(self) -> str:
        """Format as human-readable explanation sentence."""
        direction = "Increased" if self.change >= 0 else "Decreased"
        return f"{direction} from {float(self.previous_rate):.0f}% ({self.previous_year}) to {float(self.current_rate):.0f}% ({self.current_year})"


def get_savings_rate_details(data: FinanceData) -> SavingsRateDetails:
    """Get detailed YoY savings rate comparison info.

    Returns SavingsRateDetails with current/previous rates and years.
    """
    combined_df = get_combined_spending(data)
    most_recent_date = combined_df.select("Dates").row(-1)[0]
    current_year = most_recent_date.year

    rates_df = get_savings_rate_by_year(data)

    current_row_df = rates_df.filter(pl.col("Year") == current_year)
    previous_row_df = rates_df.filter(pl.col("Year") == current_year - 1)

    current_rate = current_row_df.select("Savings_Rate").row(0)[0] if not current_row_df.is_empty() else Decimal("0")
    previous_rate = previous_row_df.select("Savings_Rate").row(0)[0] if not previous_row_df.is_empty() else Decimal("0")

    change = current_rate - previous_rate

    return SavingsRateDetails(
        current_rate=current_rate,
        current_year=current_year,
        previous_rate=previous_rate,
        previous_year=current_year - 1,
        change=change,
    )
