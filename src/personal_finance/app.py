"""Dash application entry point."""

import base64
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
        Output("networth-card-collapse", "is_open"),
        Output("networth-card-chevron", "style"),
        Input("networth-card-header", "n_clicks"),
        State("networth-card-collapse", "is_open"),
        prevent_initial_call=True,
    )
    def toggle_networth_collapse(n_clicks: int | None, is_open: bool):
        if n_clicks is None:
            return no_update, no_update

        from personal_finance.theme import COLORS

        new_is_open = not is_open
        chevron_style = {
            "fontSize": "12px",
            "color": COLORS["text_muted"],
            "transition": "transform 0.2s",
            "marginTop": "4px",
            "transform": "rotate(180deg)" if new_is_open else "rotate(0deg)",
        }
        return new_is_open, chevron_style

    @callback(
        Output("income-card-collapse", "is_open"),
        Output("income-card-chevron", "style"),
        Input("income-card-header", "n_clicks"),
        State("income-card-collapse", "is_open"),
        prevent_initial_call=True,
    )
    def toggle_income_collapse(n_clicks: int | None, is_open: bool):
        if n_clicks is None:
            return no_update, no_update

        from personal_finance.theme import COLORS

        new_is_open = not is_open
        chevron_style = {
            "fontSize": "12px",
            "color": COLORS["text_muted"],
            "transition": "transform 0.2s",
            "marginTop": "4px",
            "transform": "rotate(180deg)" if new_is_open else "rotate(0deg)",
        }
        return new_is_open, chevron_style

    @callback(
        Output("spending-card-collapse", "is_open"),
        Output("spending-card-chevron", "style"),
        Input("spending-card-header", "n_clicks"),
        State("spending-card-collapse", "is_open"),
        prevent_initial_call=True,
    )
    def toggle_spending_collapse(n_clicks: int | None, is_open: bool):
        if n_clicks is None:
            return no_update, no_update

        from personal_finance.theme import COLORS

        new_is_open = not is_open
        chevron_style = {
            "fontSize": "12px",
            "color": COLORS["text_muted"],
            "transition": "transform 0.2s",
            "marginTop": "4px",
            "transform": "rotate(180deg)" if new_is_open else "rotate(0deg)",
        }
        return new_is_open, chevron_style

    @callback(
        Output("savings-card-collapse", "is_open"),
        Output("savings-card-chevron", "style"),
        Input("savings-card-header", "n_clicks"),
        State("savings-card-collapse", "is_open"),
        prevent_initial_call=True,
    )
    def toggle_savings_collapse(n_clicks: int | None, is_open: bool):
        if n_clicks is None:
            return no_update, no_update

        from personal_finance.theme import COLORS

        new_is_open = not is_open
        chevron_style = {
            "fontSize": "12px",
            "color": COLORS["text_muted"],
            "transition": "transform 0.2s",
            "marginTop": "4px",
            "transform": "rotate(180deg)" if new_is_open else "rotate(0deg)",
        }
        return new_is_open, chevron_style

    @callback(
        Output("fire-progress-card-collapse", "is_open"),
        Output("fire-progress-card-chevron", "style"),
        Input("fire-progress-card-header", "n_clicks"),
        State("fire-progress-card-collapse", "is_open"),
        prevent_initial_call=True,
    )
    def toggle_fire_progress_collapse(n_clicks: int | None, is_open: bool):
        if n_clicks is None:
            return no_update, no_update

        from personal_finance.theme import COLORS

        new_is_open = not is_open
        chevron_style = {
            "fontSize": "12px",
            "color": COLORS["text_muted"],
            "transition": "transform 0.2s",
            "marginTop": "4px",
            "transform": "rotate(180deg)" if new_is_open else "rotate(0deg)",
        }
        return new_is_open, chevron_style

    return app


def main():
    """Run the application."""
    app = create_app()
    app.run(debug=True, host="127.0.0.1", port=8050)


if __name__ == "__main__":
    main()
