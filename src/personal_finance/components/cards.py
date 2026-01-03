"""Reusable metric card components with refined styling."""

import dash_bootstrap_components as dbc
from dash import html

from personal_finance.theme import COLORS, STYLES, format_change, format_currency, format_percentage


def metric_card(
    label: str,
    value: float,
    change: float | None = None,
    change_is_percentage: bool = False,
    value_is_percentage: bool = False,
    invert_change_colors: bool = False,
    change_absolute: float | None = None,
) -> html.Div:
    """Create a styled metric card with Swiss banking aesthetic.

    Args:
        label: Card title/label
        value: Primary value to display
        change: Optional change value (shown below primary)
        change_is_percentage: If True, format change as percentage
        value_is_percentage: If True, format value as percentage
        invert_change_colors: If True, positive change is red (bad), negative is green (good)
        change_absolute: Optional absolute change value to display alongside percentage

    Returns:
        Dash HTML component for the card
    """
    if value_is_percentage:
        formatted_value = format_percentage(value).replace("+", "")
    else:
        formatted_value = format_currency(value)

    # Card with subtle copper accent line at top
    card_style = {
        **STYLES["card"],
        "borderTop": f"3px solid {COLORS['accent']}",
    }

    children = [
        html.P(label, style=STYLES["metric_label"]),
        html.P(formatted_value, style=STYLES["metric_value"]),
    ]

    if change is not None:
        change_text, change_style = format_change(
            change, is_percentage=change_is_percentage, invert_colors=invert_change_colors
        )
        # If we have both absolute and percentage, combine them
        if change_absolute is not None:
            abs_text, _ = format_change(change_absolute, is_percentage=False, invert_colors=invert_change_colors)
            change_text = f"{abs_text} / {change_text}"
        children.append(html.P(change_text, style=change_style))

    return html.Div(children=children, style=card_style)


def fire_progress_card(
    label: str,
    progress_pct: float,
    current_value: float,
    target_value: float,
) -> html.Div:
    """Create a FIRE progress card showing percentage and values.

    Args:
        label: Card title/label
        progress_pct: Percentage progress (e.g., 42.5)
        current_value: Current net worth
        target_value: FIRE number

    Returns:
        Dash HTML component for the card
    """
    card_style = {
        **STYLES["card"],
        "borderTop": f"3px solid {COLORS['accent']}",
    }

    return html.Div(
        style=card_style,
        children=[
            html.P(label, style=STYLES["metric_label"]),
            html.P(f"{progress_pct:.0f}%", style=STYLES["metric_value"]),
            html.P(
                f"{format_currency(current_value)} / {format_currency(target_value)}",
                style={
                    "fontSize": "13px",
                    "color": COLORS["text_secondary"],
                    "marginTop": "8px",
                },
            ),
        ],
    )


def fire_date_card(
    label: str,
    fire_date_str: str,
    years_remaining_str: str,
) -> html.Div:
    """Create a FIRE date card.

    Args:
        label: Card title/label
        fire_date_str: Formatted date string (e.g., "Oct 2034")
        years_remaining_str: Subtext (e.g., "8.5 years at current pace")

    Returns:
        Dash HTML component for the card
    """
    card_style = {
        **STYLES["card"],
        "borderTop": f"3px solid {COLORS['accent']}",
    }

    return html.Div(
        style=card_style,
        children=[
            html.P(label, style=STYLES["metric_label"]),
            html.P(fire_date_str, style=STYLES["metric_value"]),
            html.P(
                years_remaining_str,
                style={
                    "fontSize": "13px",
                    "color": COLORS["text_secondary"],
                    "marginTop": "8px",
                },
            ),
        ],
    )


def expandable_metric_card(
    card_id: str,
    label: str,
    value: float,
    detail_text: str,
    change: float | None = None,
    change_is_percentage: bool = False,
    change_absolute: float | None = None,
    invert_change_colors: bool = False,
    value_is_percentage: bool = False,
) -> html.Div:
    """Create an expandable metric card with collapsible detail section.

    Args:
        card_id: Unique ID for the card (used for collapse toggle)
        label: Card title/label
        value: Primary value to display
        detail_text: Text shown when expanded
        change: Optional change value (shown below primary)
        change_is_percentage: If True, format change as percentage
        change_absolute: Optional absolute change value to display alongside percentage
        invert_change_colors: If True, positive change is red (bad), negative is green (good)
        value_is_percentage: If True, format value as percentage

    Returns:
        Dash HTML component for the expandable card
    """
    if value_is_percentage:
        formatted_value = format_percentage(value).replace("+", "")
    else:
        formatted_value = format_currency(value)

    card_style = {
        **STYLES["card"],
        "borderTop": f"3px solid {COLORS['accent']}",
        "padding": "0",
    }

    header_style = {
        "padding": "20px 24px",
        "cursor": "pointer",
        "display": "flex",
        "justifyContent": "space-between",
        "alignItems": "flex-start",
    }

    content_children = [
        html.P(label, style=STYLES["metric_label"]),
        html.P(formatted_value, style=STYLES["metric_value"]),
    ]

    if change is not None:
        change_text, change_style = format_change(
            change, is_percentage=change_is_percentage, invert_colors=invert_change_colors
        )
        if change_absolute is not None:
            abs_text, _ = format_change(change_absolute, is_percentage=False, invert_colors=invert_change_colors)
            change_text = f"{abs_text} / {change_text}"
        content_children.append(html.P(change_text, style=change_style))

    chevron_style = {
        "fontSize": "12px",
        "color": COLORS["text_muted"],
        "transition": "transform 0.2s",
        "marginTop": "4px",
    }

    detail_style = {
        "padding": "0 24px 20px 24px",
        "fontSize": "13px",
        "color": COLORS["text_secondary"],
        "lineHeight": "1.5",
        "borderTop": f"1px solid {COLORS['border']}",
        "paddingTop": "16px",
    }

    return html.Div(
        style=card_style,
        children=[
            html.Div(
                id=f"{card_id}-header",
                style=header_style,
                children=[
                    html.Div(children=content_children),
                    html.Span("▼", id=f"{card_id}-chevron", style=chevron_style),
                ],
            ),
            dbc.Collapse(
                id=f"{card_id}-collapse",
                is_open=False,
                children=html.Div(detail_text, style=detail_style),
            ),
        ],
    )
