"""Excel file loading with Polars."""

from dataclasses import dataclass
from pathlib import Path

import polars as pl


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

    # Normalize column names and ensure date column is datetime
    us_spend = _normalize_df(us_spend, ["Dates", "Total", "Conversion"])
    uk_spend = _normalize_df(uk_spend, ["Dates", "Total", "Conversion"])
    us_networth = _normalize_df(us_networth, ["Dates", "Net", "Conversion"])
    uk_networth = _normalize_df(uk_networth, ["Dates", "Net", "Conversion"])
    total_comp = _normalize_df(total_comp, ["Dates", "Gross", "Pension Contrib", "Net", "Conversion"])

    return FinanceData(
        us_spend=us_spend,
        uk_spend=uk_spend,
        us_networth=us_networth,
        uk_networth=uk_networth,
        total_comp=total_comp,
    )


def _normalize_df(df: pl.DataFrame, required_columns: list[str]) -> pl.DataFrame:
    """Normalize DataFrame: check columns, parse dates, drop nulls."""
    # Check required columns exist
    missing = set(required_columns) - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Select only required columns
    df = df.select(required_columns)

    # Ensure Dates is datetime
    if df["Dates"].dtype != pl.Datetime:
        df = df.with_columns(pl.col("Dates").cast(pl.Datetime))

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
