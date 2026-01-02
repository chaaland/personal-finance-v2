"""Dash application entry point."""

import base64
from decimal import Decimal
from pathlib import Path

from dash import Dash, Input, Output, State, callback, html, no_update

from personal_finance.components.layout import create_layout
from personal_finance.data.loader import FinanceData, load_excel, load_excel_from_bytes

# Default data path
DEFAULT_DATA_PATH = Path("data/PersonalFinance.xlsx")

# Global data store
_current_data: FinanceData | None = None


def load_default_data() -> FinanceData | None:
    """Try to load data from default path."""
    if DEFAULT_DATA_PATH.exists():
        try:
            return load_excel(DEFAULT_DATA_PATH)
        except Exception as e:
            print(f"Error loading default data: {e}")
            return None
    return None


def create_app() -> Dash:
    """Create and configure the Dash application."""
    global _current_data

    app = Dash(__name__, suppress_callback_exceptions=True)

    # Try loading default data
    _current_data = load_default_data()

    app.layout = html.Div(id="main-container", children=[create_layout(_current_data)])

    @callback(
        Output("main-container", "children"),
        Input("file-upload", "contents"),
        prevent_initial_call=True,
    )
    def handle_upload(contents: str | None):
        global _current_data

        if contents is None:
            return create_layout(_current_data)

        try:
            # Parse base64 content
            content_type, content_string = contents.split(",")
            decoded = base64.b64decode(content_string)

            # Load data from uploaded file
            _current_data = load_excel_from_bytes(decoded)

            return create_layout(_current_data)
        except Exception as e:
            return html.Div(
                [
                    create_layout(None),
                    html.Div(
                        f"Error loading file: {e}",
                        style={
                            "color": "#e63757",
                            "padding": "16px",
                            "backgroundColor": "#252540",
                            "borderRadius": "8px",
                            "marginTop": "16px",
                        },
                    ),
                ]
            )

    @callback(
        Output("fire-tab-content", "children"),
        Input("fire-withdrawal-rate", "value"),
        Input("fire-lookback-years", "value"),
        prevent_initial_call=True,
    )
    def update_fire_tab(withdrawal_rate: float | None, lookback_years: int | None):
        global _current_data

        if _current_data is None:
            return no_update

        # Use defaults if invalid
        wr = Decimal(str(withdrawal_rate / 100)) if withdrawal_rate else Decimal("0.04")
        lb = int(lookback_years) if lookback_years else 3

        from personal_finance.components.fire import (
            create_fire_config_row,
            create_fire_metrics_row,
            create_fire_projection_chart,
        )
        from personal_finance.theme import STYLES
        from personal_finance.transforms import (
            get_current_runway_years,
            get_fire_number,
            get_projected_fire_date,
        )

        # Recalculate metrics
        fire_number = get_fire_number(_current_data, wr)
        runway_years = get_current_runway_years(_current_data)
        projection = get_projected_fire_date(_current_data, wr, lb)

        # Format FIRE date
        if projection.years_to_fire is not None and projection.years_to_fire == 0:
            fire_date_str = "FIRE Ready"
            years_to_fire_str = "You've reached your target!"
        elif projection.fire_date is not None:
            fire_date_str = projection.fire_date.strftime("%b %Y")
            years_to_fire_str = f"{float(projection.years_to_fire):.1f} years from now"
        else:
            fire_date_str = "N/A"
            years_to_fire_str = "Insufficient growth data"

        return [
            create_fire_config_row(),
            create_fire_metrics_row(
                fire_number=fire_number,
                runway_years=runway_years,
                fire_date_str=fire_date_str,
                years_to_fire_str=years_to_fire_str,
                withdrawal_rate=float(wr) * 100,
            ),
            html.Div(
                style=STYLES["chart_container"],
                children=[create_fire_projection_chart(_current_data, wr, lb)],
            ),
        ]

    return app


def main():
    """Run the application."""
    app = create_app()
    app.run(debug=True, host="127.0.0.1", port=8050)


if __name__ == "__main__":
    main()
