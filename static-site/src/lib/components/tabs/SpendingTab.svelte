<script lang="ts">
  import { MetricCard } from '$lib/components/cards';
  import { MonthlySpendingChart, AnnualSpendingChart, SavingsRateChart } from '$lib/components/charts';
  import AsyncContent from '$lib/components/AsyncContent.svelte';
  import {
    getProjectedAnnualSpend,
    getYoySpendingComparison,
    getMonthlySpendingWithMedian,
    getSpendingByYear,
  } from '$lib/transforms/spending';
  import { getSavingsRateByYear } from '$lib/transforms/savings';

  async function loadData() {
    const [projected, [diff, pct], monthly, annual, savingsRate] = await Promise.all([
      getProjectedAnnualSpend(),
      getYoySpendingComparison(),
      getMonthlySpendingWithMedian(),
      getSpendingByYear(),
      getSavingsRateByYear(),
    ]);

    return {
      projectedSpend: projected.toNumber(),
      yoyDiff: diff.toNumber(),
      yoyPct: pct.toNumber(),
      monthly,
      annual,
      savingsRate,
    };
  }

  const data = loadData();
</script>

<div class="spending-tab">
  <AsyncContent promise={data} loadingText="Loading spending data...">
    {#snippet children(d)}
      <div class="metrics-row">
        <MetricCard
          label="Projected Spend (This Year)"
          value={d.projectedSpend}
          change={d.yoyPct}
          changeIsPercentage={true}
          invertChangeColors={true}
          changeAbsolute={d.yoyDiff}
        />
      </div>

      <div class="chart-section">
        <MonthlySpendingChart data={d.monthly} />
      </div>

      <div class="chart-row">
        <div class="chart-section half">
          <AnnualSpendingChart data={d.annual} projectedSpend={d.projectedSpend} />
        </div>
        <div class="chart-section half">
          <SavingsRateChart data={d.savingsRate} />
        </div>
      </div>
    {/snippet}
  </AsyncContent>
</div>

<style>
  .spending-tab {
    width: 100%;
  }

  .metrics-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    margin-bottom: 24px;
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
