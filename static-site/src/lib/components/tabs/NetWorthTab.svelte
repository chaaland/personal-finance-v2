<script lang="ts">
  import { ExpandableCard } from '$lib/components/cards';
  import { NetWorthChart, YoYNetworthChart, AssetAllocationChart } from '$lib/components/charts';
  import { settings } from '$lib/stores/settings.svelte';
  import {
    getCurrentNetworth,
    getYtdNetworthChange,
    getYtdNetworthDetails,
    formatNetworthExplanation,
    getCombinedNetworth,
    getYoyNetworthChanges,
    getAssetAllocationByStock,
    getAssetAllocationByAccountType,
    type AllocationItem,
  } from '$lib/transforms/networth';
  import { getFireProjectionSeries } from '$lib/transforms/fire';
  import type { FireProjectionSeries, CombinedNetworth, YoyNetworthChange } from '$lib/data/types';

  // State
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Net worth metrics
  let currentNetworth = $state(0);
  let ytdNwChange = $state(0);
  let ytdNwPct = $state(0);
  let nwDetailsText = $state('');

  // Chart data
  let projectionData = $state<FireProjectionSeries>({
    historical: [],
    projection: [],
    fireGoal: settings.fireGoal.toNumber(),
  });
  let combinedData = $state<CombinedNetworth[]>([]);
  let yoyData = $state<YoyNetworthChange[]>([]);

  // Asset allocation data
  let selectedRegion = $state<'US' | 'UK' | 'All'>('All');
  let assetByStock = $state<AllocationItem[]>([]);
  let assetByAccountType = $state<AllocationItem[]>([]);

  async function loadMetrics(fireGoal: typeof settings.fireGoal) {
    loading = true;
    error = null;

    try {
      const [nwValue, [nwChange, nwPct], nwDetails, combined, projection, yoyChanges] =
        await Promise.all([
          getCurrentNetworth(),
          getYtdNetworthChange(),
          getYtdNetworthDetails(),
          getCombinedNetworth(),
          getFireProjectionSeries(fireGoal, 3, 2),
          getYoyNetworthChanges(),
        ]);

      currentNetworth = nwValue.toNumber();
      ytdNwChange = nwChange.toNumber();
      ytdNwPct = nwPct.toNumber();
      nwDetailsText = formatNetworthExplanation(nwDetails);

      combinedData = combined;
      projectionData = projection;
      yoyData = yoyChanges;

      // Load asset allocation for selected region
      await loadAssetAllocation();
    } catch (err) {
      console.error('Error loading net worth tab:', err);
      error = err instanceof Error ? err.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  async function loadAssetAllocation() {
    const [byStock, byAccountType] = await Promise.all([
      getAssetAllocationByStock(selectedRegion),
      getAssetAllocationByAccountType(selectedRegion),
    ]);
    assetByStock = byStock;
    assetByAccountType = byAccountType;
  }

  function handleRegionChange(region: 'US' | 'UK' | 'All') {
    selectedRegion = region;
    loadAssetAllocation();
  }

  $effect(() => {
    const fireGoal = settings.fireGoal;
    loadMetrics(fireGoal);
  });
</script>

<div class="networth-tab">
  {#if loading}
    <div class="loading">Loading net worth data...</div>
  {:else if error}
    <div class="error">
      <p>Error loading data: {error}</p>
    </div>
  {:else}
    <!-- Metrics row -->
    <div class="metrics-row">
      <ExpandableCard
        cardId="networth-card"
        label="Current Net Worth"
        value={currentNetworth}
        detailText={nwDetailsText}
        change={ytdNwPct}
        changeIsPercentage={true}
        changeAbsolute={ytdNwChange}
      />
    </div>

    <!-- Net worth over time chart -->
    <div class="chart-section">
      <NetWorthChart data={projectionData} {combinedData} />
    </div>

    <!-- Asset Allocation section -->
    <div class="chart-section asset-allocation">
      <div class="section-header">
        <h3>Asset Allocation</h3>
        <div class="region-selector">
          <button
            class="region-btn"
            class:active={selectedRegion === 'US'}
            onclick={() => handleRegionChange('US')}
          >
            US
          </button>
          <button
            class="region-btn"
            class:active={selectedRegion === 'UK'}
            onclick={() => handleRegionChange('UK')}
          >
            UK
          </button>
          <button
            class="region-btn"
            class:active={selectedRegion === 'All'}
            onclick={() => handleRegionChange('All')}
          >
            All
          </button>
        </div>
      </div>
      <div class="donut-charts">
        <div class="donut-chart">
          <AssetAllocationChart data={assetByStock} title="By Stock" />
        </div>
        <div class="donut-chart">
          <AssetAllocationChart data={assetByAccountType} title="By Account Type" />
        </div>
      </div>
    </div>

    <!-- YoY change chart -->
    <div class="chart-section">
      <YoYNetworthChart data={yoyData} />
    </div>
  {/if}
</div>

<style>
  .networth-tab {
    width: 100%;
  }

  .loading,
  .error {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    font-size: 16px;
  }

  .loading {
    color: var(--color-text-secondary);
  }

  .error {
    color: var(--color-negative);
  }

  .metrics-row {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 24px;
    margin-bottom: 24px;
  }

  .chart-section {
    background: var(--color-card);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
    border: 1px solid var(--color-border);
  }

  .asset-allocation .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .asset-allocation h3 {
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
  }
</style>
