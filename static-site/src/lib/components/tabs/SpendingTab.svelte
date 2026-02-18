<script lang="ts">
  import { onMount } from 'svelte';
  import { MetricCard } from '$lib/components/cards';
  import { MonthlySpendingChart, AnnualSpendingChart, SavingsRateChart } from '$lib/components/charts';
  import {
    getProjectedAnnualSpend,
    getYoySpendingComparison,
    getMonthlySpendingWithMedian,
    getSpendingByYear,
  } from '$lib/transforms/spending';
  import { getSavingsRateByYear } from '$lib/transforms/savings';
  import type { MonthlySpendingRow, SpendingByYear, SavingsRateByYear } from '$lib/data/types';

  // State
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Metrics
  let projectedSpend = $state(0);
  let yoyDiff = $state(0);
  let yoyPct = $state(0);

  // Chart data
  let monthlyData = $state<MonthlySpendingRow[]>([]);
  let annualData = $state<SpendingByYear[]>([]);
  let savingsRateData = $state<SavingsRateByYear[]>([]);

  async function loadData() {
    loading = true;
    error = null;

    try {
      const [projected, [diff, pct], monthly, annual, savingsRate] = await Promise.all([
        getProjectedAnnualSpend(),
        getYoySpendingComparison(),
        getMonthlySpendingWithMedian(),
        getSpendingByYear(),
        getSavingsRateByYear(),
      ]);

      projectedSpend = projected.toNumber();
      yoyDiff = diff.toNumber();
      yoyPct = pct.toNumber();
      monthlyData = monthly;
      annualData = annual;
      savingsRateData = savingsRate;
    } catch (err) {
      console.error('Error loading spending tab:', err);
      error = err instanceof Error ? err.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<div class="spending-tab">
  {#if loading}
    <div class="loading">Loading spending data...</div>
  {:else if error}
    <div class="error">
      <p>Error loading data: {error}</p>
    </div>
  {:else}
    <!-- Metrics row - single card spanning full width -->
    <div class="metrics-row">
      <MetricCard
        label="Projected Spend (This Year)"
        value={projectedSpend}
        change={yoyPct}
        changeIsPercentage={true}
        invertChangeColors={true}
        changeAbsolute={yoyDiff}
      />
    </div>

    <!-- Monthly spending chart -->
    <div class="chart-section">
      <MonthlySpendingChart data={monthlyData} />
    </div>

    <!-- Annual spending and savings rate charts side by side -->
    <div class="chart-row">
      <div class="chart-section half">
        <AnnualSpendingChart data={annualData} />
      </div>
      <div class="chart-section half">
        <SavingsRateChart data={savingsRateData} />
      </div>
    </div>
  {/if}
</div>

<style>
  .spending-tab {
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
    grid-template-columns: 1fr;
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

  .chart-row {
    display: flex;
    gap: 20px;
  }

  .chart-section.half {
    flex: 1;
    margin-bottom: 0;
  }
</style>
