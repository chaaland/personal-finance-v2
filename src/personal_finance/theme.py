"""Refined Swiss Banking aesthetic for the dashboard.

Design direction: "Midnight Vault" - Dark mode variant
- Deep charcoal/obsidian backgrounds with warm undertones
- Burnished gold/champagne accents for luxurious warmth
- Bold, oversized numbers with serif elegance
- Generous negative space and precise geometry
- Subtle ambient glow for private banking atmosphere
"""

from decimal import Decimal
from typing import Union

# Type alias for numeric values that can be Decimal or float
NumericValue = Union[Decimal, float]

# Google Fonts import URL - Adding Playfair Display for refined dark mode headers
FONTS_URL = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@400;500;600&display=swap"

# Color palette - Midnight Vault (Dark Mode)
COLORS = {
    # Backgrounds - Deep obsidian with warm undertones
    "background": "#0D0D0F",  # Near-black with slight warmth
    "card": "#18181B",  # Elevated dark surface (zinc-900)
    "card_elevated": "#1F1F23",  # Hover/elevated state
    # Text - High contrast with warm whites
    "text_primary": "#FAFAF9",  # Warm white (stone-50)
    "text_secondary": "#A8A29E",  # Warm gray (stone-400)
    "text_muted": "#78716C",  # Dimmed warm gray (stone-500)
    # Accents - Burnished gold/champagne
    "accent": "#D4A853",  # Burnished gold
    "accent_light": "#E5C06E",  # Lighter champagne
    "accent_glow": "rgba(212, 168, 83, 0.15)",  # Gold ambient glow
    # Semantic - Muted tones for refined dark aesthetic
    "positive": "#6EBF8B",  # Sage green (sophisticated, less saturated)
    "positive_bg": "rgba(110, 191, 139, 0.12)",
    "negative": "#E07A7A",  # Dusty rose (softer coral)
    "negative_bg": "rgba(224, 122, 122, 0.12)",
    # Charts - Muted, sophisticated palette for professional finance
    "chart_1": "#D4A853",  # Burnished gold (primary accent - unchanged)
    "chart_2": "#7BA3C9",  # Slate blue (desaturated sapphire)
    "chart_3": "#6EBF8B",  # Sage green (muted emerald)
    "chart_4": "#D4956A",  # Terracotta (muted amber)
    # Borders and lines - Subtle dark borders
    "border": "#27272A",  # Zinc-800
    "border_strong": "#3F3F46",  # Zinc-700
    "divider": "#1F1F23",  # Subtle divider
}

# Typography - Enhanced for dark mode legibility
FONTS = {
    "display": "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
    "body": "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
}

# Plotly chart template - Dark and refined
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
            "tickfont": {"size": 11, "color": COLORS["text_muted"]},
            "showgrid": False,
            "zeroline": False,
        },
        "yaxis": {
            "gridcolor": COLORS["border"],
            "linecolor": "rgba(0,0,0,0)",
            "tickfont": {"size": 11, "color": COLORS["text_muted"]},
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
            "bgcolor": COLORS["card_elevated"],
            "font": {"color": COLORS["text_primary"], "family": FONTS["body"]},
            "bordercolor": COLORS["border_strong"],
        },
    }
}

# CSS styles - Dark mode refinement
STYLES = {
    "page": {
        "backgroundColor": COLORS["background"],
        "minHeight": "100vh",
        "padding": "40px 48px",
        "fontFamily": FONTS["body"],
        "color": COLORS["text_primary"],
        # Subtle radial gradient for depth
        "backgroundImage": "radial-gradient(ellipse at 50% 0%, rgba(212, 168, 83, 0.03) 0%, transparent 50%)",
    },
    "card": {
        "backgroundColor": COLORS["card"],
        "borderRadius": "3px",
        "padding": "32px",
        "marginBottom": "20px",
        "border": f"1px solid {COLORS['border']}",
        "boxShadow": "0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)",
        "position": "relative",
        # Subtle inner glow on top edge
        "backgroundImage": f"linear-gradient(180deg, {COLORS['card_elevated']} 0%, {COLORS['card']} 2px)",
    },
    "metric_value": {
        "fontSize": "42px",
        "fontWeight": "500",
        "fontFamily": FONTS["display"],
        "color": COLORS["text_primary"],
        "margin": "0",
        "letterSpacing": "-0.02em",
        "lineHeight": "1.1",
        # Subtle text shadow for depth
        "textShadow": "0 2px 4px rgba(0, 0, 0, 0.3)",
    },
    "metric_label": {
        "fontSize": "11px",
        "fontWeight": "600",
        "fontFamily": FONTS["body"],
        "color": COLORS["text_muted"],
        "marginBottom": "12px",
        "textTransform": "uppercase",
        "letterSpacing": "0.12em",
    },
    "metric_change_positive": {
        "fontSize": "13px",
        "fontWeight": "500",
        "color": COLORS["positive"],
        "marginTop": "12px",
        "padding": "6px 12px",
        "backgroundColor": COLORS["positive_bg"],
        "borderRadius": "3px",
        "display": "inline-block",
        "border": f"1px solid rgba(110, 191, 139, 0.2)",
    },
    "metric_change_negative": {
        "fontSize": "13px",
        "fontWeight": "500",
        "color": COLORS["negative"],
        "marginTop": "12px",
        "padding": "6px 12px",
        "backgroundColor": COLORS["negative_bg"],
        "borderRadius": "3px",
        "display": "inline-block",
        "border": f"1px solid rgba(224, 122, 122, 0.2)",
    },
    "tab": {
        "backgroundColor": "transparent",
        "color": COLORS["text_muted"],
        "border": "none",
        "borderBottom": "2px solid transparent",
        "borderRadius": "0",
        "padding": "16px 24px",
        "fontFamily": FONTS["body"],
        "fontSize": "13px",
        "fontWeight": "500",
        "textTransform": "uppercase",
        "letterSpacing": "0.1em",
        "transition": "all 0.25s ease",
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
        "letterSpacing": "0.1em",
        # Subtle glow effect on selected tab
        "textShadow": f"0 0 20px {COLORS['accent_glow']}",
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
        "fontWeight": "500",
        "fontFamily": FONTS["display"],
        "color": COLORS["text_primary"],
        "margin": "0",
        "letterSpacing": "-0.01em",
        # Subtle gold accent on title
        "backgroundImage": f"linear-gradient(135deg, {COLORS['text_primary']} 0%, {COLORS['accent_light']} 100%)",
        "WebkitBackgroundClip": "text",
        "WebkitTextFillColor": "transparent",
        "backgroundClip": "text",
    },
    "grid": {
        "display": "grid",
        "gridTemplateColumns": "repeat(3, 1fr)",

        # "gridTemplateColumns": "repeat(auto-fit, minmax(280px, 1fr))",
        "gap": "20px",
        "marginBottom": "32px",
    },
    "chart_container": {
        "backgroundColor": COLORS["card"],
        "borderRadius": "3px",
        "padding": "24px",
        "marginBottom": "20px",
        "border": f"1px solid {COLORS['border']}",
        "boxShadow": "0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)",
        # Subtle inner glow
        "backgroundImage": f"linear-gradient(180deg, {COLORS['card_elevated']} 0%, {COLORS['card']} 2px)",
    },
    "upload_button": {
        "padding": "12px 24px",
        "backgroundColor": COLORS["card"],
        "border": f"1px solid {COLORS['border_strong']}",
        "borderRadius": "3px",
        "cursor": "pointer",
        "color": COLORS["text_secondary"],
        "fontFamily": FONTS["body"],
        "fontSize": "13px",
        "fontWeight": "500",
        "letterSpacing": "0.02em",
        "transition": "all 0.25s ease",
        "boxShadow": "0 2px 8px rgba(0, 0, 0, 0.3)",
    },
    "empty_state": {
        "textAlign": "center",
        "padding": "80px 40px",
        "backgroundColor": COLORS["card"],
        "border": f"1px solid {COLORS['border']}",
        "borderRadius": "3px",
        "boxShadow": "0 4px 24px rgba(0, 0, 0, 0.4)",
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
