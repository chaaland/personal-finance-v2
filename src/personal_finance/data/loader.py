"""Excel file loading with Polars.

Uses Decimal type with 4 decimal places for all currency values
to ensure accurate financial calculations without floating point errors.
"""

from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import polars as pl

# Currency columns that should be cast to Decimal(precision=15, scale=4)
# 15 total digits with 4 after decimal point (up to ~$99 trillion)
CURRENCY_PRECISION = 15
CURRENCY_SCALE = 4
CURRENCY_DTYPE = pl.Decimal(precision=CURRENCY_PRECISION, scale=CURRENCY_SCALE)


@dataclass
class FinanceData:
    """Container for all loaded finance data."""

    us_spend: pl.DataFrame
    uk_spend: pl.DataFrame
    us_networth: pl.DataFrame
    uk_networth: pl.DataFrame
    total_comp: pl.DataFrame


def load_excel(file_path: str | Path) -> FinanceData:
    """Load finance data from Excel file.

    Args:
        file_path: Path to the Excel file.

    Returns:
        FinanceData containing all sheets as DataFrames.

    Raises:
        FileNotFoundError: If file doesn't exist.
        ValueError: If required sheets are missing.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    required_sheets = ["US Spend", "UK Spend", "US Networth", "UK Networth", "Total Comp"]

    try:
        us_spend = pl.read_excel(path, sheet_name="US Spend", engine="xlsx2csv")
        uk_spend = pl.read_excel(path, sheet_name="UK Spend", engine="xlsx2csv")
        us_networth = pl.read_excel(path, sheet_name="US Networth", engine="xlsx2csv")
        uk_networth = pl.read_excel(path, sheet_name="UK Networth", engine="xlsx2csv")
        total_comp = pl.read_excel(path, sheet_name="Total Comp", engine="xlsx2csv")
    except Exception as e:
        raise ValueError(f"Error reading Excel file. Ensure sheets exist: {required_sheets}. Error: {e}")

    # Normalize column names, ensure date column is datetime, cast currency to Decimal
    us_spend = _normalize_df(us_spend, ["Dates", "Total", "Conversion"], currency_columns=["Total", "Conversion"])
    uk_spend = _normalize_df(uk_spend, ["Dates", "Total", "Conversion"], currency_columns=["Total", "Conversion"])
    us_networth = _normalize_df(us_networth, ["Dates", "Net", "Conversion"], currency_columns=["Net", "Conversion"])
    uk_networth = _normalize_df(uk_networth, ["Dates", "Net", "Conversion"], currency_columns=["Net", "Conversion"])
    total_comp = _normalize_df(
        total_comp,
        ["Dates", "Gross", "Pension Contrib", "Net", "Conversion"],
        currency_columns=["Gross", "Pension Contrib", "Net", "Conversion"],
    )

    return FinanceData(
        us_spend=us_spend,
        uk_spend=uk_spend,
        us_networth=us_networth,
        uk_networth=uk_networth,
        total_comp=total_comp,
    )


def _normalize_df(df: pl.DataFrame, required_columns: list[str], currency_columns: list[str]) -> pl.DataFrame:
    """Normalize DataFrame: check columns, parse dates, cast currency to Decimal, drop nulls.

    Args:
        df: Input DataFrame
        required_columns: List of column names that must exist
        currency_columns: List of column names that should be cast to Decimal
    """
    # Check required columns exist
    missing = set(required_columns) - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Select only required columns
    df = df.select(required_columns)

    # Ensure Dates is datetime
    if df["Dates"].dtype == pl.String:
        # xlsx2csv sometimes produces dates with embedded quotes like: 2025"-"12"-"31
        # Also handle YYYY-MM format (used in Total Comp sheet)
        df = df.with_columns(
            pl.col("Dates").str.replace_all('"', "").alias("Dates_clean")  # Remove any embedded quotes
        )
        # Try YYYY-MM-DD first, then YYYY-MM
        sample = df["Dates_clean"][0]
        if len(sample) == 10:  # YYYY-MM-DD format
            df = df.with_columns(pl.col("Dates_clean").str.to_datetime("%Y-%m-%d").alias("Dates"))
        else:  # YYYY-MM format - append -01 for first of month
            df = df.with_columns((pl.col("Dates_clean") + "-01").str.to_datetime("%Y-%m-%d").alias("Dates"))
        df = df.drop("Dates_clean")
    elif df["Dates"].dtype == pl.Date:
        # Convert Date to Datetime
        df = df.with_columns(pl.col("Dates").cast(pl.Datetime))
    elif df["Dates"].dtype != pl.Datetime:
        df = df.with_columns(pl.col("Dates").cast(pl.Datetime))

    # Cast currency columns to Decimal for precise financial calculations
    for col in currency_columns:
        if col in df.columns:
            df = df.with_columns(pl.col(col).cast(CURRENCY_DTYPE))

    # Drop rows with null dates
    df = df.drop_nulls(subset=["Dates"])

    return df


def load_excel_from_bytes(content: bytes) -> FinanceData:
    """Load finance data from uploaded file bytes.

    Args:
        content: Raw bytes of the Excel file.

    Returns:
        FinanceData containing all sheets as DataFrames.
    """
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        tmp.write(content)
        tmp.flush()
        return load_excel(tmp.name)
