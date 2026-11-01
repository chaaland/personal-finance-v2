<script lang="ts">
  import { MetricCard } from '$lib/components/cards';
  import { IncomeChart } from '$lib/components/charts';
  import AsyncContent from '$lib/components/AsyncContent.svelte';
  import {
    getYtdGrossIncome,
    getYtdNetIncome,
    getYoyIncomeComparison,
    getYoyNetIncomeComparison,
    getIncomeByYear,
  } from '$lib/transforms/income';

  async function loadData() {
    const [gross, net, [grossDiff, grossPct], [netDiff, netPct], byYear] = await Promise.all([
      getYtdGrossIncome(),
      getYtdNetIncome(),
      getYoyIncomeComparison(),
      getYoyNetIncomeComparison(),
      getIncomeByYear(),
    ]);

    return {
      gross: gross.toNumber(),
      grossDiff: grossDiff.toNumber(),
      grossPct: grossPct.toNumber(),
      net: net.toNumber(),
      netDiff: netDiff.toNumber(),
      netPct: netPct.toNumber(),
      byYear,
    };
  }

  const data = loadData();
</script>

<div class="income-tab">
  <AsyncContent promise={data} loadingText="Loading income data...">
    {#snippet children(d)}
      <div class="metrics-row">
        <MetricCard
          label="Total Comp (YTD)"
          value={d.gross}
          change={d.grossPct}
          changeIsPercentage={true}
          changeAbsolute={d.grossDiff}
        />
        <MetricCard
          label="Net Pay (YTD)"
          value={d.net}
          change={d.netPct}
          changeIsPercentage={true}
          changeAbsolute={d.netDiff}
        />
      </div>

      <div class="chart-section">
        <IncomeChart data={d.byYear} />
      </div>
    {/snippet}
  </AsyncContent>
</div>

<style>
  .income-tab {
    width: 100%;
  }

  .metrics-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    margin-bottom: 24px;
  }
</style>
