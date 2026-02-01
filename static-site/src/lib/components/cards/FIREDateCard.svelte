<script lang="ts">
  interface Props {
    cardId: string;
    label: string;
    fireDateStr: string;
    yearsRemainingStr: string;
  }

  let {
    cardId,
    label,
    fireDateStr,
    yearsRemainingStr,
  }: Props = $props();

  let isOpen = $state(false);

  function toggleCollapse() {
    isOpen = !isOpen;
  }
</script>

<div class="card" id={cardId}>
  <button
    class="header"
    id="{cardId}-header"
    onclick={toggleCollapse}
    aria-expanded={isOpen}
    aria-controls="{cardId}-collapse"
  >
    <div class="content">
      <p class="label">{label}</p>
      <p class="value">{fireDateStr}</p>
    </div>
    <span class="chevron" class:open={isOpen} id="{cardId}-chevron">&#9660;</span>
  </button>
  {#if isOpen}
    <div class="detail" id="{cardId}-collapse">
      {yearsRemainingStr}
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

  .header {
    width: 100%;
    padding: 20px 24px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    min-height: 175px;
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
    padding: 0 24px 20px 24px;
    font-size: 13px;
    color: var(--color-text-secondary);
    line-height: 1.5;
    border-top: 1px solid var(--color-border);
    padding-top: 16px;
  }
</style>
