<script lang="ts">
  import { MetricCard } from '$lib/components/cards';
  import { NetWorthChart, YoYNetworthChart } from '$lib/components/charts';
  import AsyncContent from '$lib/components/AsyncContent.svelte';
  import AssetAllocationSection from '$lib/components/AssetAllocationSection.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import {
    getCurrentNetworth,
    getYtdNetworthChange,
    getYtdNetworthDetails,
    formatNetworthExplanation,
    getCombinedNetworth,
    getYoyNetworthChanges,
  } from '$lib/transforms/networth';
  import { getFireProjectionSeries } from '$lib/transforms/fire';
  import type Decimal from 'decimal.js';

  async function loadData(fireGoal: Decimal) {
    const [current, [change, changePct], details, combined, projection, yoy] = await Promise.all([
      getCurrentNetworth(),
      getYtdNetworthChange(),
      getYtdNetworthDetails(),
      getCombinedNetworth(),
      getFireProjectionSeries(fireGoal, 3, 2),
      getYoyNetworthChanges(),
    ]);

    return {
      current: current.toNumber(),
      change: change.toNumber(),
      changePct: changePct.toNumber(),
      detailText: formatNetworthExplanation(details),
      combined,
      projection,
      yoy,
    };
  }

  const data = $derived(loadData(settings.fireGoal));
</script>

<div class="networth-tab">
  <AsyncContent promise={data} loadingText="Loading net worth data...">
    {#snippet children(d)}
      <div class="metrics-row">
        <MetricCard
          cardId="networth-card"
          label="Current Net Worth"
          value={d.current}
          detailText={d.detailText}
          change={d.changePct}
          changeIsPercentage={true}
          changeAbsolute={d.change}
        />
      </div>

      <div class="chart-section">
        <NetWorthChart data={d.projection} combinedData={d.combined} />
      </div>

      <AssetAllocationSection />

      <div class="chart-section">
        <YoYNetworthChart data={d.yoy} />
      </div>
    {/snippet}
  </AsyncContent>
</div>

<style>
  .networth-tab {
    width: 100%;
  }

  .metrics-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    margin-bottom: 24px;
  }
</style>
