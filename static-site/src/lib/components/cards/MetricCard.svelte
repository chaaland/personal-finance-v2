<script lang="ts">
  import { formatCurrency, formatPercentage, formatChange } from '$lib/theme';

  interface Props {
    label: string;
    value: number;
    change?: number;
    changeIsPercentage?: boolean;
    valueIsPercentage?: boolean;
    invertChangeColors?: boolean;
    changeAbsolute?: number;
  }

  let {
    label,
    value,
    change,
    changeIsPercentage = false,
    valueIsPercentage = false,
    invertChangeColors = false,
    changeAbsolute,
  }: Props = $props();

  const formattedValue = $derived(
    valueIsPercentage ? formatPercentage(value).replace('+', '') : formatCurrency(value)
  );

  const changeDisplay = $derived(
    change !== undefined
      ? formatChange(change, changeIsPercentage, invertChangeColors, changeAbsolute)
      : null
  );
</script>

<div class="card">
  <p class="label">{label}</p>
  <p class="value">{formattedValue}</p>
  {#if changeDisplay}
    <p class="change" class:positive={changeDisplay.isPositive} class:negative={!changeDisplay.isPositive}>
      {changeDisplay.text}
    </p>
  {/if}
</div>

<style>
  .card {
    background-color: var(--color-card);
    border-radius: 8px;
    padding: 20px 24px;
    border-top: 3px solid var(--color-accent);
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
</style>
