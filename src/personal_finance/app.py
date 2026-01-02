"""Dash application entry point."""

import base64
from pathlib import Path

from dash import Dash, Input, Output, callback, html

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

    return app


def main():
    """Run the application."""
    app = create_app()
    app.run(debug=True, host="127.0.0.1", port=8050)


if __name__ == "__main__":
    main()
