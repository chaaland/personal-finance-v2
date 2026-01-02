"""Reusable metric card components with refined styling."""

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
