"""Dark theme styling for the dashboard."""

# Color palette
COLORS = {
    "background": "#1a1a2e",
    "card": "#252540",
    "text_primary": "#ffffff",
    "text_secondary": "#b0b0b0",
    "positive": "#00d97e",
    "negative": "#e63757",
    "chart_1": "#6366f1",  # Indigo
    "chart_2": "#06b6d4",  # Cyan
    "chart_3": "#8b5cf6",  # Purple
    "chart_4": "#14b8a6",  # Teal
}

# Plotly chart template
CHART_TEMPLATE = {
    "layout": {
        "paper_bgcolor": COLORS["background"],
        "plot_bgcolor": COLORS["background"],
        "font": {"color": COLORS["text_primary"]},
        "xaxis": {
            "gridcolor": "#3a3a5a",
            "linecolor": "#3a3a5a",
        },
        "yaxis": {
            "gridcolor": "#3a3a5a",
            "linecolor": "#3a3a5a",
        },
        "legend": {
            "bgcolor": "rgba(0,0,0,0)",
            "font": {"color": COLORS["text_secondary"]},
        },
    }
}

# CSS styles
STYLES = {
    "page": {
        "backgroundColor": COLORS["background"],
        "minHeight": "100vh",
        "padding": "20px",
        "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    "card": {
        "backgroundColor": COLORS["card"],
        "borderRadius": "12px",
        "padding": "24px",
        "marginBottom": "16px",
    },
    "metric_value": {
        "fontSize": "32px",
        "fontWeight": "bold",
        "color": COLORS["text_primary"],
        "margin": "0",
    },
    "metric_label": {
        "fontSize": "14px",
        "color": COLORS["text_secondary"],
        "marginBottom": "8px",
    },
    "metric_change_positive": {
        "fontSize": "14px",
        "color": COLORS["positive"],
        "marginTop": "4px",
    },
    "metric_change_negative": {
        "fontSize": "14px",
        "color": COLORS["negative"],
        "marginTop": "4px",
    },
    "tab": {
        "backgroundColor": COLORS["card"],
        "color": COLORS["text_secondary"],
        "border": "none",
        "borderRadius": "8px 8px 0 0",
        "padding": "12px 24px",
    },
    "tab_selected": {
        "backgroundColor": COLORS["background"],
        "color": COLORS["text_primary"],
        "border": "none",
        "borderRadius": "8px 8px 0 0",
        "padding": "12px 24px",
        "borderBottom": f"2px solid {COLORS['chart_1']}",
    },
    "header": {
        "display": "flex",
        "justifyContent": "space-between",
        "alignItems": "center",
        "marginBottom": "24px",
    },
    "title": {
        "fontSize": "28px",
        "fontWeight": "bold",
        "color": COLORS["text_primary"],
        "margin": "0",
    },
    "grid": {
        "display": "grid",
        "gridTemplateColumns": "repeat(auto-fit, minmax(250px, 1fr))",
        "gap": "16px",
        "marginBottom": "24px",
    },
    "chart_container": {
        "backgroundColor": COLORS["card"],
        "borderRadius": "12px",
        "padding": "16px",
        "marginBottom": "16px",
    },
}


def format_currency(value: float) -> str:
    """Format a number as USD currency."""
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:,.2f}M"
    elif abs(value) >= 1_000:
        return f"${value / 1_000:,.1f}K"
    else:
        return f"${value:,.0f}"


def format_percentage(value: float) -> str:
    """Format a number as a percentage."""
    return f"{value:+.1f}%"


def format_change(value: float, is_percentage: bool = False) -> tuple[str, dict]:
    """Format a change value with appropriate styling."""
    if is_percentage:
        text = format_percentage(value)
    else:
        sign = "+" if value >= 0 else ""
        text = f"{sign}{format_currency(value)}"

    style = STYLES["metric_change_positive"] if value >= 0 else STYLES["metric_change_negative"]
    return text, style
