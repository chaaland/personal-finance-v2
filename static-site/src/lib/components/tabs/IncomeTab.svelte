<script lang="ts">
  import { onMount } from 'svelte';
  import { MetricCard } from '$lib/components/cards';
  import { IncomeChart } from '$lib/components/charts';
  import {
    getYtdGrossIncome,
    getYtdNetIncome,
    getYoyIncomeComparison,
    getYoyNetIncomeComparison,
    getIncomeByYear,
  } from '$lib/transforms/income';
  import type { IncomeByYear } from '$lib/data/types';

  // State
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Income metrics
  let ytdGross = $state(0);
  let ytdNet = $state(0);
  let yoyGrossDiff = $state(0);
  let yoyGrossPct = $state(0);
  let yoyNetDiff = $state(0);
  let yoyNetPct = $state(0);

  // Chart data
  let incomeByYearData = $state<IncomeByYear[]>([]);

  async function loadData() {
    loading = true;
    error = null;

    try {
      const [grossIncome, netIncome, [grossDiff, grossPct], [netDiff, netPct], incomeByYear] =
        await Promise.all([
          getYtdGrossIncome(),
          getYtdNetIncome(),
          getYoyIncomeComparison(),
          getYoyNetIncomeComparison(),
          getIncomeByYear(),
        ]);

      ytdGross = grossIncome.toNumber();
      ytdNet = netIncome.toNumber();
      yoyGrossDiff = grossDiff.toNumber();
      yoyGrossPct = grossPct.toNumber();
      yoyNetDiff = netDiff.toNumber();
      yoyNetPct = netPct.toNumber();
      incomeByYearData = incomeByYear;
    } catch (err) {
      console.error('Error loading income tab:', err);
      error = err instanceof Error ? err.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<div class="income-tab">
  {#if loading}
    <div class="loading">Loading income data...</div>
  {:else if error}
    <div class="error">
      <p>Error loading data: {error}</p>
    </div>
  {:else}
    <!-- Metrics row - 2 column grid -->
    <div class="metrics-row">
      <MetricCard
        label="Total Comp (YTD)"
        value={ytdGross}
        change={yoyGrossPct}
        changeIsPercentage={true}
        changeAbsolute={yoyGrossDiff}
      />
      <MetricCard
        label="Net Pay (YTD)"
        value={ytdNet}
        change={yoyNetPct}
        changeIsPercentage={true}
        changeAbsolute={yoyNetDiff}
      />
    </div>

    <!-- Income chart -->
    <div class="chart-section">
      <IncomeChart data={incomeByYearData} />
    </div>
  {/if}
</div>

<style>
  .income-tab {
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
    grid-template-columns: repeat(2, 1fr);
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
</style>
