"""Main dashboard layout with refined Swiss banking aesthetic."""

from dash import dcc, html

from personal_finance.components.income import create_income_tab
from personal_finance.components.networth import create_networth_tab
from personal_finance.components.spending import create_spending_tab
from personal_finance.components.summary import create_summary_tab
from personal_finance.data.loader import FinanceData
from personal_finance.theme import COLORS, FONTS, FONTS_URL, STYLES


def create_header() -> html.Div:
    """Create the dashboard header with refined typography."""
    return html.Div(
        style=STYLES["header"],
        children=[
            html.H1("Personal Finance", style=STYLES["title"]),
            dcc.Upload(
                id="file-upload",
                children=html.Div(
                    [
                        html.Span("Upload Data", style={"marginRight": "8px"}),
                        html.Span("↑", style={"fontSize": "14px"}),
                    ]
                ),
                style=STYLES["upload_button"],
            ),
        ],
    )


def create_tabs(data: FinanceData) -> html.Div:
    """Create the tabbed interface with refined styling."""
    return html.Div(
        children=[
            dcc.Tabs(
                id="tabs",
                value="summary",
                children=[
                    dcc.Tab(
                        label="Summary",
                        value="summary",
                        style=STYLES["tab"],
                        selected_style=STYLES["tab_selected"],
                        children=html.Div(
                            style={"paddingTop": "32px"},
                            children=create_summary_tab(data),
                        ),
                    ),
                    dcc.Tab(
                        label="Net Worth",
                        value="networth",
                        style=STYLES["tab"],
                        selected_style=STYLES["tab_selected"],
                        children=html.Div(
                            style={"paddingTop": "32px"},
                            children=create_networth_tab(data),
                        ),
                    ),
                    dcc.Tab(
                        label="Income",
                        value="income",
                        style=STYLES["tab"],
                        selected_style=STYLES["tab_selected"],
                        children=html.Div(
                            style={"paddingTop": "32px"},
                            children=create_income_tab(data),
                        ),
                    ),
                    dcc.Tab(
                        label="Spending",
                        value="spending",
                        style=STYLES["tab"],
                        selected_style=STYLES["tab_selected"],
                        children=html.Div(
                            style={"paddingTop": "32px"},
                            children=create_spending_tab(data),
                        ),
                    ),
                ],
            ),
        ]
    )


def create_layout(data: FinanceData | None) -> html.Div:
    """Create the main dashboard layout with Google Fonts."""
    # Font loader - injects Google Fonts
    font_loader = html.Link(rel="stylesheet", href=FONTS_URL)

    if data is None:
        return html.Div(
            style=STYLES["page"],
            children=[
                font_loader,
                create_header(),
                html.Div(
                    style=STYLES["empty_state"],
                    children=[
                        html.Div(
                            "◇",
                            style={
                                "fontSize": "48px",
                                "color": COLORS["accent"],
                                "marginBottom": "24px",
                                "fontWeight": "300",
                            },
                        ),
                        html.H2(
                            "No Data Loaded",
                            style={
                                "fontFamily": FONTS["display"],
                                "fontSize": "28px",
                                "fontWeight": "600",
                                "color": COLORS["text_primary"],
                                "marginBottom": "12px",
                                "letterSpacing": "-0.02em",
                            },
                        ),
                        html.P(
                            "Upload an Excel file to view your financial dashboard.",
                            style={
                                "color": COLORS["text_secondary"],
                                "fontSize": "15px",
                                "maxWidth": "320px",
                                "margin": "0 auto",
                                "lineHeight": "1.6",
                            },
                        ),
                    ],
                ),
            ],
        )

    return html.Div(
        style=STYLES["page"],
        children=[
            font_loader,
            create_header(),
            create_tabs(data),
        ],
    )
