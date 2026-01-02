"""Main dashboard layout."""

from dash import dcc, html

from personal_finance.components.income import create_income_tab
from personal_finance.components.networth import create_networth_tab
from personal_finance.components.spending import create_spending_tab
from personal_finance.components.summary import create_summary_tab
from personal_finance.data.loader import FinanceData
from personal_finance.theme import COLORS, STYLES


def create_header() -> html.Div:
    """Create the dashboard header with title and upload."""
    return html.Div(
        style=STYLES["header"],
        children=[
            html.H1("Personal Finance Dashboard", style=STYLES["title"]),
            dcc.Upload(
                id="file-upload",
                children=html.Div(
                    [
                        html.Span("Upload Excel File", style={"marginRight": "8px"}),
                        html.Span("📁"),
                    ]
                ),
                style={
                    "padding": "10px 20px",
                    "backgroundColor": COLORS["card"],
                    "borderRadius": "8px",
                    "cursor": "pointer",
                    "color": COLORS["text_secondary"],
                },
            ),
        ],
    )


def create_tabs(data: FinanceData) -> dcc.Tabs:
    """Create the tabbed interface."""
    return dcc.Tabs(
        id="tabs",
        value="summary",
        children=[
            dcc.Tab(
                label="Summary",
                value="summary",
                style=STYLES["tab"],
                selected_style=STYLES["tab_selected"],
                children=create_summary_tab(data),
            ),
            dcc.Tab(
                label="Net Worth",
                value="networth",
                style=STYLES["tab"],
                selected_style=STYLES["tab_selected"],
                children=create_networth_tab(data),
            ),
            dcc.Tab(
                label="Income",
                value="income",
                style=STYLES["tab"],
                selected_style=STYLES["tab_selected"],
                children=create_income_tab(data),
            ),
            dcc.Tab(
                label="Spending",
                value="spending",
                style=STYLES["tab"],
                selected_style=STYLES["tab_selected"],
                children=create_spending_tab(data),
            ),
        ],
    )


def create_layout(data: FinanceData | None) -> html.Div:
    """Create the main dashboard layout."""
    if data is None:
        return html.Div(
            style=STYLES["page"],
            children=[
                create_header(),
                html.Div(
                    style={
                        **STYLES["card"],
                        "textAlign": "center",
                        "padding": "60px",
                    },
                    children=[
                        html.H2(
                            "No Data Loaded",
                            style={"color": COLORS["text_primary"], "marginBottom": "16px"},
                        ),
                        html.P(
                            "Upload an Excel file or place PersonalFinance.xlsx in the data/ folder.",
                            style={"color": COLORS["text_secondary"]},
                        ),
                    ],
                ),
            ],
        )

    return html.Div(
        style=STYLES["page"],
        children=[
            create_header(),
            create_tabs(data),
        ],
    )
