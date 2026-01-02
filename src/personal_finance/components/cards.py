"""Reusable metric card components."""

from dash import html

from personal_finance.theme import STYLES, format_change, format_currency, format_percentage


def metric_card(
    label: str,
    value: float,
    change: float | None = None,
    change_is_percentage: bool = False,
    value_is_percentage: bool = False,
) -> html.Div:
    """Create a styled metric card.

    Args:
        label: Card title/label
        value: Primary value to display
        change: Optional change value (shown below primary)
        change_is_percentage: If True, format change as percentage
        value_is_percentage: If True, format value as percentage

    Returns:
        Dash HTML component for the card
    """
    if value_is_percentage:
        formatted_value = format_percentage(value).replace("+", "")
    else:
        formatted_value = format_currency(value)

    children = [
        html.P(label, style=STYLES["metric_label"]),
        html.P(formatted_value, style=STYLES["metric_value"]),
    ]

    if change is not None:
        change_text, change_style = format_change(change, is_percentage=change_is_percentage)
        children.append(html.P(change_text, style=change_style))

    return html.Div(children=children, style=STYLES["card"])
