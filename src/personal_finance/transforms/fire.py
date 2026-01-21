"""FIRE (Financial Independence, Retire Early) calculations.

Uses Decimal types for all currency calculations.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import NamedTuple

import polars as pl
from scipy.optimize import minimize_scalar

from personal_finance.data.loader import FinanceData
from personal_finance.transforms.networth import get_combined_networth, get_current_networth
from personal_finance.transforms.spending import get_projected_annual_spend


class FireProjection(NamedTuple):
    """Result of FIRE projection calculation."""

    fire_date: datetime | None  # None if already FIRE or can't project
    years_to_fire: Decimal | None
    annual_nw_growth: Decimal


def get_fire_number(data: FinanceData, withdrawal_rate: Decimal = Decimal("0.04")) -> Decimal:
    """Calculate FIRE number based on projected annual spending and withdrawal rate.

    FIRE number = projected_annual_spend / withdrawal_rate

    Args:
        data: Finance data
        withdrawal_rate: Safe withdrawal rate as decimal (e.g., 0.04 for 4%)

    Returns:
        FIRE number in USD
    """
    projected_spend = get_projected_annual_spend(data)
    if withdrawal_rate == 0:
        return Decimal("0")
    return projected_spend / withdrawal_rate


def get_fire_progress_pct(data: FinanceData, fire_goal: Decimal) -> Decimal:
    """Calculate percentage progress toward FIRE goal.

    Args:
        data: Finance data
        fire_goal: Target FIRE number in USD

    Returns:
        Progress percentage (e.g., 42.5 for 42.5%)
    """
    if fire_goal == 0:
        return Decimal("0")
    current_nw = get_current_networth(data)
    return (current_nw / fire_goal) * Decimal("100")


def get_current_runway_years(data: FinanceData) -> Decimal:
    """Calculate how many years current net worth would last at projected spending.

    Args:
        data: Finance data

    Returns:
        Years of runway
    """
    current_nw = get_current_networth(data)
    projected_spend = get_projected_annual_spend(data)
    if projected_spend == 0:
        return Decimal("0")
    return current_nw / projected_spend


def _fit_lad_regression(x_values: list[float], y_values: list[float]) -> tuple[float, float]:
    """Fit a line using Least Absolute Deviation (LAD) regression.

    LAD minimizes sum of absolute residuals, making it more robust to outliers
    than ordinary least squares which minimizes squared residuals.

    Args:
        x_values: Independent variable (time in years)
        y_values: Dependent variable (net worth)

    Returns:
        Tuple of (slope, intercept)
    """
    n = len(x_values)
    if n < 2:
        return 0.0, 0.0

    # For LAD, we need to find slope and intercept that minimize sum(|y - (mx + b)|)
    # We'll use a two-step approach:
    # 1. Find optimal slope by minimizing over a range
    # 2. For each slope, find optimal intercept (median of residuals)

    def objective(slope: float) -> float:
        """Calculate sum of absolute residuals for a given slope."""
        # For a given slope, optimal intercept is median of (y - slope*x)
        residuals = [y - slope * x for x, y in zip(x_values, y_values)]
        residuals_sorted = sorted(residuals)
        if n % 2 == 0:
            intercept = (residuals_sorted[n // 2 - 1] + residuals_sorted[n // 2]) / 2
        else:
            intercept = residuals_sorted[n // 2]

        # Calculate sum of absolute residuals
        return sum(abs(y - (slope * x + intercept)) for x, y in zip(x_values, y_values))

    # Estimate initial bounds for slope using two-point method
    x_mean = sum(x_values) / n
    y_mean = sum(y_values) / n
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, y_values))
    denominator = sum((x - x_mean) ** 2 for x in x_values)
    ols_slope = numerator / denominator if denominator != 0 else 0

    # Search for optimal slope in a range around OLS estimate
    bracket = (ols_slope - abs(ols_slope) * 2, ols_slope + abs(ols_slope) * 2)
    result = minimize_scalar(objective, bounds=bracket, method="bounded")
    optimal_slope = result.x

    # Calculate optimal intercept for the optimal slope
    residuals = [y - optimal_slope * x for x, y in zip(x_values, y_values)]
    residuals_sorted = sorted(residuals)
    if n % 2 == 0:
        optimal_intercept = (residuals_sorted[n // 2 - 1] + residuals_sorted[n // 2]) / 2
    else:
        optimal_intercept = residuals_sorted[n // 2]

    return optimal_slope, optimal_intercept


def get_annual_nw_growth(data: FinanceData, lookback_years: int = 3) -> Decimal:
    """Calculate average annual net worth growth over lookback period.

    Uses Least Absolute Deviation (LAD) regression on all data points in the
    lookback period. LAD is more robust to outliers than ordinary least squares,
    making it suitable for financial data with market volatility.

    Args:
        data: Finance data
        lookback_years: Number of years to look back

    Returns:
        Average annual growth in USD (slope of LAD regression line)
    """
    combined_df = get_combined_networth(data)
    if combined_df.is_empty():
        return Decimal("0")

    most_recent_date = combined_df.select("Dates").row(-1)[0]
    cutoff_date = most_recent_date.replace(year=most_recent_date.year - lookback_years)

    # Filter to lookback period
    period_df = combined_df.filter(pl.col("Dates") >= cutoff_date).sort("Dates")

    if len(period_df) < 2:
        return Decimal("0")

    # Get start date for normalization
    start_date = period_df.select("Dates").row(0)[0]

    # Convert dates to years since start
    x_values = []
    y_values = []
    for row in period_df.iter_rows():
        date_val = row[0]  # Dates column
        nw_val = row[1]  # Total_USD column
        days_elapsed = (date_val - start_date).days
        years_elapsed = days_elapsed / 365.25
        x_values.append(years_elapsed)
        y_values.append(float(nw_val))

    # Fit LAD regression
    slope, _ = _fit_lad_regression(x_values, y_values)

    # Slope is in units of USD per year
    return Decimal(str(slope))


def get_projected_fire_date(
    data: FinanceData,
    fire_goal: Decimal,
    lookback_years: int = 3,
) -> FireProjection:
    """Project when FIRE will be achieved based on historical growth.

    Args:
        data: Finance data
        fire_goal: Target FIRE number in USD
        lookback_years: Years of history to use for growth calculation

    Returns:
        FireProjection with date, years to FIRE, and annual growth
    """
    fire_number = fire_goal
    current_nw = get_current_networth(data)
    annual_growth = get_annual_nw_growth(data, lookback_years)

    # Already at FIRE
    if current_nw >= fire_number:
        return FireProjection(fire_date=None, years_to_fire=Decimal("0"), annual_nw_growth=annual_growth)

    # No growth or negative growth - can't project
    if annual_growth <= 0:
        return FireProjection(fire_date=None, years_to_fire=None, annual_nw_growth=annual_growth)

    # Calculate years to FIRE
    gap = fire_number - current_nw
    years_to_fire = gap / annual_growth

    # Get most recent date and add years
    combined_df = get_combined_networth(data)
    most_recent_date = combined_df.select("Dates").row(-1)[0]

    # Calculate projected date
    days_to_add = int(float(years_to_fire) * 365.25)
    fire_date = most_recent_date + timedelta(days=days_to_add)

    return FireProjection(fire_date=fire_date, years_to_fire=years_to_fire, annual_nw_growth=annual_growth)


def get_fire_projection_series(
    data: FinanceData,
    fire_goal: Decimal,
    lookback_years: int = 3,
    projection_years: int = 2,
) -> tuple[pl.DataFrame, pl.DataFrame, Decimal]:
    """Get historical and projected net worth series for charting.

    Args:
        data: Finance data
        fire_goal: Target FIRE number in USD
        lookback_years: Years of history for growth calculation
        projection_years: Years to project into future

    Returns:
        Tuple of (historical_df, projection_df, fire_number)
        - historical_df: Dates, Total_USD columns
        - projection_df: Dates, Total_USD columns (projected values)
        - fire_number: The FIRE target
    """
    from personal_finance.data.loader import CURRENCY_DTYPE

    historical_df = get_combined_networth(data).select("Dates", "Total_USD")
    fire_number = fire_goal
    annual_growth = get_annual_nw_growth(data, lookback_years)

    if historical_df.is_empty():
        empty_df = pl.DataFrame({"Dates": [], "Total_USD": []})
        return empty_df, empty_df, fire_number

    # Get current values
    most_recent_date = historical_df.select("Dates").row(-1)[0]
    current_nw = historical_df.select("Total_USD").row(-1)[0]

    # Create projection points (monthly for smooth line)
    months_to_project = projection_years * 12
    projection_dates = []
    projection_values = []

    for month in range(1, months_to_project + 1):
        proj_date = most_recent_date + timedelta(days=month * 30)
        years_elapsed = Decimal(str(month)) / Decimal("12")
        proj_value = current_nw + (annual_growth * years_elapsed)
        projection_dates.append(proj_date)
        projection_values.append(proj_value)

    projection_df = pl.DataFrame(
        {
            "Dates": projection_dates,
            "Total_USD": projection_values,
        }
    ).with_columns(pl.col("Total_USD").cast(CURRENCY_DTYPE))

    return historical_df, projection_df, fire_number


# Tax-optimized withdrawal order: deplete taxable/low-growth first, preserve tax-free longest
WITHDRAWAL_ORDER = ["HYSA", "Coinbase", "Taxable Brokerage", "401k", "IRA", "HSA", "Roth IRA"]

# Accounts that grow at the investment growth rate (5% default)
GROWTH_ACCOUNTS = {"Taxable Brokerage", "401k", "IRA", "HSA", "Roth IRA"}


def get_retirement_drawdown_series(
    data: FinanceData,
    fire_goal: Decimal,
    withdrawal_rate: Decimal = Decimal("0.04"),
    growth_rate: Decimal = Decimal("0.05"),
    inflation_rate: Decimal = Decimal("0.02"),
    retirement_age: int = 50,
    end_age: int = 95,
) -> pl.DataFrame:
    """Calculate portfolio balance and withdrawals over retirement by account type.

    Uses tax-optimized withdrawal strategy: deplete accounts in priority order
    (HYSA → Coinbase → Taxable Brokerage → 401k/IRA → HSA → Roth IRA) to minimize
    taxes and preserve tax-free growth as long as possible.

    Investment accounts (Taxable Brokerage, 401k, IRA, HSA, Roth IRA) grow at the
    specified growth rate each year. HYSA and Coinbase are assumed to have no growth.

    Withdrawals increase annually by the inflation rate to maintain purchasing power.

    Args:
        data: Finance data containing asset allocation with Account Type column
        fire_goal: Target FIRE number (starting balance at retirement)
        withdrawal_rate: Annual withdrawal rate as decimal (e.g., 0.04 for 4%)
        growth_rate: Annual investment growth rate as decimal (e.g., 0.07 for 7%)
        inflation_rate: Annual inflation rate as decimal (e.g., 0.02 for 2%)
        retirement_age: Age at retirement
        end_age: Age to project to

    Returns:
        DataFrame with columns:
        - Age: Integer age
        - Year: Retirement year (1-indexed)
        - One column per account type with remaining balance
        - Total_Balance: Sum of all account balances
        - Withdrawal: Amount withdrawn that year
    """
    from personal_finance.data.loader import CURRENCY_DTYPE

    # Aggregate balances by account type using polars group_by
    allocation_df = data.us_asset_allocation
    grouped = (
        allocation_df.group_by("Account Type")
        .agg(pl.col("Value").sum().alias("Total"))
        .to_dict(as_series=False)
    )

    # Convert to dict with Decimal values
    account_balances: dict[str, Decimal] = {
        account_type: Decimal("0") for account_type in WITHDRAWAL_ORDER
    }
    for account_type, total in zip(grouped["Account Type"], grouped["Total"]):
        if account_type in account_balances:
            account_balances[account_type] = Decimal(str(total)) if total else Decimal("0")

    # Scale balances to match FIRE goal (current allocation as proportion of target)
    current_total = sum(account_balances.values())
    if current_total > 0:
        scale_factor = fire_goal / current_total
        for account_type in WITHDRAWAL_ORDER:
            account_balances[account_type] = account_balances[account_type] * scale_factor

    base_withdrawal = fire_goal * withdrawal_rate
    growth_multiplier = Decimal("1") + growth_rate
    inflation_multiplier = Decimal("1") + inflation_rate

    # Build year-by-year projection
    rows: list[dict] = []
    for year_num, age in enumerate(range(retirement_age, end_age + 1), start=1):
        # Apply growth to investment accounts at start of year (before withdrawal)
        if year_num > 1:  # Don't apply growth in first year (already at FIRE goal)
            for account_type in GROWTH_ACCOUNTS:
                account_balances[account_type] = account_balances[account_type] * growth_multiplier

        total_balance = sum(account_balances.values())

        # Record start-of-year balances (after growth, before withdrawal)
        row: dict = {"Age": age, "Year": year_num}
        for account_type in WITHDRAWAL_ORDER:
            row[account_type] = account_balances[account_type]
        row["Total_Balance"] = total_balance

        # Calculate withdrawal for this year (increases with inflation each year)
        annual_withdrawal = base_withdrawal * (inflation_multiplier ** (year_num - 1))
        remaining_to_withdraw = min(annual_withdrawal, total_balance)
        row["Withdrawal"] = remaining_to_withdraw

        # Deplete accounts in priority order
        for account_type in WITHDRAWAL_ORDER:
            if remaining_to_withdraw <= 0:
                break
            available = account_balances[account_type]
            withdraw_from_this = min(available, remaining_to_withdraw)
            account_balances[account_type] = available - withdraw_from_this
            remaining_to_withdraw -= withdraw_from_this

        rows.append(row)

    # Convert Decimal values to float for DataFrame creation (avoids Polars overflow with large decimals)
    for row in rows:
        for key, value in row.items():
            if isinstance(value, Decimal):
                row[key] = float(value)

    # Create DataFrame and cast to Decimal
    df = pl.DataFrame(rows)
    currency_cols = WITHDRAWAL_ORDER + ["Total_Balance", "Withdrawal"]
    for col in currency_cols:
        df = df.with_columns(pl.col(col).cast(CURRENCY_DTYPE))

    return df


def get_swr_sensitivity(
    data: FinanceData,
    withdrawal_rates: list[Decimal],
    lookback_years: int = 3,
    base_fire_goal: Decimal | None = None,
    base_swr: Decimal = Decimal("0.04"),
) -> pl.DataFrame:
    """Calculate FIRE dates for different safe withdrawal rates.

    Shows how the projected FIRE date changes at different SWR percentages.
    Lower SWR = larger required nest egg = later FIRE date (more conservative).

    The FIRE goal is scaled relative to a base goal and SWR. For example, if the
    base goal is $4M at 4% SWR, then at 3% SWR the goal would be $5.33M (4M * 4/3).

    Args:
        data: Finance data
        withdrawal_rates: List of withdrawal rates as decimals (e.g., 0.04 for 4%)
        lookback_years: Years of history to use for growth calculation
        base_fire_goal: Base FIRE goal to scale from. If None, uses get_fire_number with base_swr.
        base_swr: The SWR that corresponds to base_fire_goal (default 4%)

    Returns:
        DataFrame with columns:
        - SWR: Withdrawal rate as percentage (e.g., 4.0 for 4%)
        - FireDate: Projected FIRE date (datetime or None)
        - YearsToFire: Years until FIRE (Decimal or None)
    """
    if base_fire_goal is None:
        base_fire_goal = get_fire_number(data, base_swr)

    results = []
    for wr in withdrawal_rates:
        # Scale the FIRE goal: lower SWR = higher goal
        # FIRE_goal = base_goal * (base_swr / wr)
        fire_goal = base_fire_goal * (base_swr / wr)
        projection = get_projected_fire_date(data, fire_goal, lookback_years)
        results.append(
            {
                "SWR": wr * Decimal("100"),
                "FireDate": projection.fire_date,
                "YearsToFire": projection.years_to_fire,
            }
        )
    return pl.DataFrame(results)
