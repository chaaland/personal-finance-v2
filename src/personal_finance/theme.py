"""Refined Swiss Banking aesthetic for the dashboard.

Design direction: Luxurious warmth meets brutalist typography.
- Warm ivory/cream backgrounds with deep charcoal
- Copper/bronze accents for that "old money" feel
- Bold, oversized numbers with serif elegance
- Generous whitespace and precise geometry
"""

from decimal import Decimal
from typing import Union

# Type alias for numeric values that can be Decimal or float
NumericValue = Union[Decimal, float]

# Google Fonts import URL (add to HTML head or use @import in CSS)
FONTS_URL = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap"

# Color palette - Warm ivory with copper accents
COLORS = {
    # Backgrounds
    "background": "#F7F5F0",  # Warm ivory
    "card": "#FFFFFF",  # Pure white cards
    "card_elevated": "#FFFEF9",  # Slightly warm white
    # Text
    "text_primary": "#1C1917",  # Deep charcoal (stone-900)
    "text_secondary": "#78716C",  # Warm gray (stone-500)
    "text_muted": "#A8A29E",  # Lighter warm gray
    # Accents
    "accent": "#B45309",  # Copper/amber
    "accent_light": "#D97706",  # Lighter copper
    "accent_glow": "rgba(180, 83, 9, 0.1)",  # Copper glow
    # Semantic
    "positive": "#166534",  # Deep forest green
    "positive_bg": "rgba(22, 101, 52, 0.08)",
    "negative": "#991B1B",  # Deep burgundy red
    "negative_bg": "rgba(153, 27, 27, 0.08)",
    # Charts - Earthy, sophisticated palette
    "chart_1": "#B45309",  # Copper
    "chart_2": "#1E3A5F",  # Navy
    "chart_3": "#166534",  # Forest
    "chart_4": "#7C2D12",  # Burnt sienna
    # Borders and lines
    "border": "#E7E5E4",  # Warm gray border
    "border_strong": "#D6D3D1",
    "divider": "#F5F5F4",
}

# Typography
FONTS = {
    "display": "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    "body": "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
}

# Plotly chart template - Refined and minimal
CHART_TEMPLATE = {
    "layout": {
        "paper_bgcolor": COLORS["card"],
        "plot_bgcolor": COLORS["card"],
        "font": {
            "family": FONTS["body"],
            "color": COLORS["text_secondary"],
            "size": 12,
        },
        "title": {
            "font": {
                "family": FONTS["display"],
                "size": 20,
                "color": COLORS["text_primary"],
            },
            "x": 0,
            "xanchor": "left",
        },
        "xaxis": {
            "gridcolor": COLORS["divider"],
            "linecolor": COLORS["border"],
            "tickfont": {"size": 11},
            "showgrid": False,
            "zeroline": False,
        },
        "yaxis": {
            "gridcolor": COLORS["divider"],
            "linecolor": "rgba(0,0,0,0)",
            "tickfont": {"size": 11},
            "showgrid": True,
            "gridwidth": 1,
            "zeroline": False,
        },
        "legend": {
            "bgcolor": "rgba(0,0,0,0)",
            "font": {"color": COLORS["text_secondary"], "size": 11},
            "orientation": "h",
            "yanchor": "bottom",
            "y": 1.02,
            "xanchor": "left",
            "x": 0,
        },
        "margin": {"t": 60, "r": 24, "b": 48, "l": 60},
        "hoverlabel": {
            "bgcolor": COLORS["text_primary"],
            "font": {"color": COLORS["card"], "family": FONTS["body"]},
            "bordercolor": COLORS["text_primary"],
        },
    }
}

# CSS styles
STYLES = {
    "page": {
        "backgroundColor": COLORS["background"],
        "minHeight": "100vh",
        "padding": "40px 48px",
        "fontFamily": FONTS["body"],
        "color": COLORS["text_primary"],
    },
    "card": {
        "backgroundColor": COLORS["card"],
        "borderRadius": "2px",  # Sharp, minimal radius
        "padding": "32px",
        "marginBottom": "20px",
        "border": f"1px solid {COLORS['border']}",
        "boxShadow": "0 1px 3px rgba(28, 25, 23, 0.04)",
        "position": "relative",
    },
    "metric_value": {
        "fontSize": "42px",
        "fontWeight": "600",
        "fontFamily": FONTS["display"],
        "color": COLORS["text_primary"],
        "margin": "0",
        "letterSpacing": "-0.02em",
        "lineHeight": "1.1",
    },
    "metric_label": {
        "fontSize": "11px",
        "fontWeight": "600",
        "fontFamily": FONTS["body"],
        "color": COLORS["text_muted"],
        "marginBottom": "12px",
        "textTransform": "uppercase",
        "letterSpacing": "0.1em",
    },
    "metric_change_positive": {
        "fontSize": "13px",
        "fontWeight": "500",
        "color": COLORS["positive"],
        "marginTop": "12px",
        "padding": "6px 10px",
        "backgroundColor": COLORS["positive_bg"],
        "borderRadius": "2px",
        "display": "inline-block",
    },
    "metric_change_negative": {
        "fontSize": "13px",
        "fontWeight": "500",
        "color": COLORS["negative"],
        "marginTop": "12px",
        "padding": "6px 10px",
        "backgroundColor": COLORS["negative_bg"],
        "borderRadius": "2px",
        "display": "inline-block",
    },
    "tab": {
        "backgroundColor": "transparent",
        "color": COLORS["text_muted"],
        "border": "none",
        "borderBottom": f"2px solid transparent",
        "borderRadius": "0",
        "padding": "16px 24px",
        "fontFamily": FONTS["body"],
        "fontSize": "13px",
        "fontWeight": "500",
        "textTransform": "uppercase",
        "letterSpacing": "0.08em",
        "transition": "all 0.2s ease",
    },
    "tab_selected": {
        "backgroundColor": "transparent",
        "color": COLORS["accent"],
        "border": "none",
        "borderBottom": f"2px solid {COLORS['accent']}",
        "borderRadius": "0",
        "padding": "16px 24px",
        "fontFamily": FONTS["body"],
        "fontSize": "13px",
        "fontWeight": "600",
        "textTransform": "uppercase",
        "letterSpacing": "0.08em",
    },
    "header": {
        "display": "flex",
        "justifyContent": "space-between",
        "alignItems": "center",
        "marginBottom": "48px",
        "paddingBottom": "24px",
        "borderBottom": f"1px solid {COLORS['border']}",
    },
    "title": {
        "fontSize": "32px",
        "fontWeight": "600",
        "fontFamily": FONTS["display"],
        "color": COLORS["text_primary"],
        "margin": "0",
        "letterSpacing": "-0.02em",
    },
    "grid": {
        "display": "grid",
        "gridTemplateColumns": "repeat(auto-fit, minmax(280px, 1fr))",
        "gap": "20px",
        "marginBottom": "32px",
    },
    "chart_container": {
        "backgroundColor": COLORS["card"],
        "borderRadius": "2px",
        "padding": "24px",
        "marginBottom": "20px",
        "border": f"1px solid {COLORS['border']}",
        "boxShadow": "0 1px 3px rgba(28, 25, 23, 0.04)",
    },
    # New styles for enhanced components
    "upload_button": {
        "padding": "12px 24px",
        "backgroundColor": COLORS["card"],
        "border": f"1px solid {COLORS['border']}",
        "borderRadius": "2px",
        "cursor": "pointer",
        "color": COLORS["text_secondary"],
        "fontFamily": FONTS["body"],
        "fontSize": "13px",
        "fontWeight": "500",
        "letterSpacing": "0.02em",
        "transition": "all 0.2s ease",
    },
    "empty_state": {
        "textAlign": "center",
        "padding": "80px 40px",
        "backgroundColor": COLORS["card"],
        "border": f"1px solid {COLORS['border']}",
        "borderRadius": "2px",
    },
    "tabs_container": {
        "borderBottom": f"1px solid {COLORS['border']}",
        "marginBottom": "32px",
    },
}


def format_currency(value: NumericValue) -> str:
    """Format a number as USD currency.

    Accepts both Decimal and float values for compatibility.
    """
    # Convert to float for formatting (Decimal formatting would be identical)
    v = float(value)
    if abs(v) >= 1_000_000:
        return f"${v / 1_000_000:,.2f}M"
    elif abs(v) >= 1_000:
        return f"${v / 1_000:,.1f}K"
    else:
        return f"${v:,.0f}"


def format_percentage(value: NumericValue) -> str:
    """Format a number as a percentage.

    Accepts both Decimal and float values for compatibility.
    """
    return f"{float(value):+.1f}%"


def format_change(value: NumericValue, is_percentage: bool = False, invert_colors: bool = False) -> tuple[str, dict]:
    """Format a change value with appropriate styling.

    Args:
        value: The change value (Decimal or float)
        is_percentage: If True, format as percentage
        invert_colors: If True, positive values are red (bad) and negative are green (good)
    """
    if is_percentage:
        text = format_percentage(value)
    else:
        sign = "+" if value >= 0 else ""
        text = f"{sign}{format_currency(value)}"

    is_positive = value >= 0
    if invert_colors:
        is_positive = not is_positive

    style = STYLES["metric_change_positive"] if is_positive else STYLES["metric_change_negative"]
    return text, style
