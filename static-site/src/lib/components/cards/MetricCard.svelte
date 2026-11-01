<script lang="ts">
  import { formatCurrency, formatPercentage, formatChange } from '$lib/theme';

  interface Props {
    label: string;
    /** A number is formatted as currency (or a percentage); a string is shown as-is. */
    value: number | string;
    subtext?: string;
    change?: number;
    changeIsPercentage?: boolean;
    valueIsPercentage?: boolean;
    invertChangeColors?: boolean;
    changeAbsolute?: number;
    /** When set, the card expands on click to reveal this text. */
    detailText?: string;
    /** Used to build element ids for an expandable card. */
    cardId?: string;
  }

  let {
    label,
    value,
    subtext,
    change,
    changeIsPercentage = false,
    valueIsPercentage = false,
    invertChangeColors = false,
    changeAbsolute,
    detailText,
    cardId,
  }: Props = $props();

  let isOpen = $state(false);

  const formattedValue = $derived(
    typeof value === 'string'
      ? value
      : valueIsPercentage
        ? formatPercentage(value).replace('+', '')
        : formatCurrency(value)
  );

  const changeDisplay = $derived(
    change !== undefined
      ? formatChange(change, changeIsPercentage, invertChangeColors, changeAbsolute)
      : null
  );
</script>

{#snippet body()}
  <p class="label">{label}</p>
  <p class="value">{formattedValue}</p>
  {#if subtext}
    <p class="subtext">{subtext}</p>
  {/if}
  {#if changeDisplay}
    <p class="change" class:positive={changeDisplay.isPositive} class:negative={!changeDisplay.isPositive}>
      {changeDisplay.text}
    </p>
  {/if}
{/snippet}

<div class="card" id={cardId}>
  {#if detailText !== undefined}
    <button
      class="header"
      id={cardId && `${cardId}-header`}
      onclick={() => (isOpen = !isOpen)}
      aria-expanded={isOpen}
      aria-controls={cardId && `${cardId}-collapse`}
    >
      <div class="content">
        {@render body()}
      </div>
      <span class="chevron" class:open={isOpen} id={cardId && `${cardId}-chevron`}>&#9660;</span>
    </button>
    {#if isOpen}
      <div class="detail" id={cardId && `${cardId}-collapse`}>
        {detailText}
      </div>
    {/if}
  {:else}
    <div class="static">
      {@render body()}
    </div>
  {/if}
</div>

<style>
  .card {
    background-color: var(--color-card);
    border-radius: 8px;
    border-top: 3px solid var(--color-accent);
    padding: 0;
  }

  .static {
    padding: 20px 24px;
  }

  .header {
    width: 100%;
    padding: 20px 24px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    min-height: 170px;
    background: none;
    border: none;
    text-align: left;
  }

  .content {
    display: flex;
    flex-direction: column;
  }

  .label {
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin: 0 0 8px 0;
  }

  .value {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
    margin: 0;
  }

  .subtext {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin: 8px 0 0 0;
  }

  .change {
    font-size: 14px;
    margin: 8px 0 0 0;
  }

  .change.positive {
    color: var(--color-positive);
  }

  .change.negative {
    color: var(--color-negative);
  }

  .chevron {
    font-size: 12px;
    color: var(--color-text-muted);
    transition: transform 0.2s;
    margin-top: 4px;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .detail {
    padding: 16px 24px 20px 24px;
    font-size: 13px;
    color: var(--color-text-secondary);
    line-height: 1.5;
    border-top: 1px solid var(--color-border);
  }
</style>
