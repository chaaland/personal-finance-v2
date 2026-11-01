<script lang="ts">
  import { AssetAllocationChart } from '$lib/components/charts';
  import {
    getAssetAllocationByStock,
    getAssetAllocationByAccountType,
    type AllocationItem,
  } from '$lib/transforms/networth';

  const REGIONS = ['US', 'UK', 'All'] as const;

  let region = $state<(typeof REGIONS)[number]>('All');
  let byStock = $state<AllocationItem[] | null>(null);
  let byAccountType = $state<AllocationItem[] | null>(null);

  // Reload when the region changes; ignore a result that arrives after a newer request.
  $effect(() => {
    let stale = false;
    Promise.all([getAssetAllocationByStock(region), getAssetAllocationByAccountType(region)]).then(
      ([stock, accountType]) => {
        if (stale) return;
        byStock = stock;
        byAccountType = accountType;
      }
    );
    return () => {
      stale = true;
    };
  });
</script>

<div class="chart-section">
  <div class="section-header">
    <h3>Asset Allocation</h3>
    <div class="region-selector">
      {#each REGIONS as r}
        <button class="region-btn" class:active={region === r} onclick={() => (region = r)}>
          {r}
        </button>
      {/each}
    </div>
  </div>
  <div class="donut-charts">
    <div class="donut-chart">
      {#if byStock}
        <AssetAllocationChart data={byStock} title="By Stock" />
      {/if}
    </div>
    <div class="donut-chart">
      {#if byAccountType}
        <AssetAllocationChart data={byAccountType} title="By Account Type" />
      {/if}
    </div>
  </div>
</div>

<style>
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  h3 {
    font-family: var(--font-display);
    font-size: 20px;
    color: var(--color-text-primary);
    margin: 0;
  }

  .region-selector {
    display: flex;
    gap: 4px;
    background: var(--color-background);
    padding: 4px;
    border-radius: 8px;
  }

  .region-btn {
    padding: 6px 16px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .region-btn:hover {
    color: var(--color-text-primary);
  }

  .region-btn.active {
    background: var(--color-card-elevated);
    color: var(--color-accent);
  }

  .donut-charts {
    display: flex;
    gap: 8px;
  }

  .donut-chart {
    flex: 1;
    min-height: 400px;
  }
</style>
