<script lang="ts">
  import Decimal from 'decimal.js';
  import { MetricCard } from '$lib/components/cards';
  import { SWRSensitivityChart } from '$lib/components/charts';
  import AsyncContent from '$lib/components/AsyncContent.svelte';
  import { formatCurrency } from '$lib/theme';
  import { settings } from '$lib/stores/settings.svelte';
  import {
    getCurrentNetworth,
    getYtdNetworthChange,
    getYtdNetworthDetails,
    formatNetworthExplanation,
  } from '$lib/transforms/networth';
  import {
    getYtdGrossIncome,
    getYoyIncomeComparison,
    getYtdIncomeDetails,
    formatIncomeExplanation,
  } from '$lib/transforms/income';
  import {
    getProjectedAnnualSpend,
    getYoySpendingComparison,
    getSpendingProjectionDetails,
    formatSpendingExplanation,
  } from '$lib/transforms/spending';
  import {
    getCurrentYearSavingsRate,
    getSavingsRateDetails,
    formatSavingsExplanation,
  } from '$lib/transforms/savings';
  import { getFireProgressPct, getCurrentRunwayYears } from '$lib/transforms/fire';
  import { getFireProjection } from '$lib/transforms/projection';
  import { formatFireDate, formatFireRange, formatAssumptions } from '$lib/transforms/projection-format';

  async function loadMetrics(fireGoal: Decimal, expectedRealReturn: number) {
    // Load everything in parallel with one outer Promise.all
    const [
      [nwValue, [nwChange, nwPct], nwDetails],
      [incomeValue, [incomeDiff, incomePct], incomeDetails],
      [spendValue, [spendDiff, spendPct], spendDetails],
      [rateValue, savingsDetails],
      [progress, projection, runway],
    ] = await Promise.all([
      Promise.all([getCurrentNetworth(), getYtdNetworthChange(), getYtdNetworthDetails()]),
      Promise.all([getYtdGrossIncome(), getYoyIncomeComparison(), getYtdIncomeDetails()]),
      Promise.all([
        getProjectedAnnualSpend(),
        getYoySpendingComparison(),
        getSpendingProjectionDetails(),
      ]),
      Promise.all([getCurrentYearSavingsRate(), getSavingsRateDetails()]),
      Promise.all([
        getFireProgressPct(fireGoal),
        getFireProjection(fireGoal, expectedRealReturn),
        getCurrentRunwayYears(),
      ]),
    ]);

    const projectedSpend = spendValue.toNumber();
    const currentNetworth = nwValue.toNumber();

    return {
      networth: {
        value: currentNetworth,
        change: nwChange.toNumber(),
        pct: nwPct.toNumber(),
        detail: formatNetworthExplanation(nwDetails),
      },
      income: {
        value: incomeValue.toNumber(),
        diff: incomeDiff.toNumber(),
        pct: incomePct.toNumber(),
        detail: formatIncomeExplanation(incomeDetails),
      },
      spend: {
        value: projectedSpend,
        diff: spendDiff.toNumber(),
        pct: spendPct.toNumber(),
        detail: formatSpendingExplanation(spendDetails),
      },
      savings: {
        rate: rateValue.toNumber(),
        change: savingsDetails.change,
        detail: formatSavingsExplanation(savingsDetails),
      },
      fire: {
        progressPct: progress.toNumber(),
        progressSubtext: `${formatCurrency(currentNetworth)} / ${formatCurrency(fireGoal)}`,
        runwayDetail: `${runway.toNumber().toFixed(1)} years runway at ${formatCurrency(projectedSpend)}/yr spend`,
        dateStr: formatFireDate(projection.estimate),
        dateDetail: `${formatFireRange(projection.estimate)}. ${formatAssumptions(projection.assumptions)}.`,
      },
      swrData: projection.swr,
    };
  }

  // Reloads (and shows the loading state) whenever the FIRE goal or expected return changes
  const metrics = $derived(loadMetrics(settings.fireGoal, settings.expectedRealReturn));
</script>

<div class="summary-tab">
  <AsyncContent promise={metrics} loadingText="Loading metrics...">
    {#snippet children(m)}
      <div class="metrics-grid">
        <MetricCard
          cardId="networth-card"
          label="Current Net Worth"
          value={m.networth.value}
          detailText={m.networth.detail}
          change={m.networth.pct}
          changeIsPercentage={true}
          changeAbsolute={m.networth.change}
        />

        <MetricCard
          cardId="income-card"
          label="Total Comp (YTD)"
          value={m.income.value}
          detailText={m.income.detail}
          change={m.income.pct}
          changeIsPercentage={true}
          changeAbsolute={m.income.diff}
        />

        <MetricCard
          cardId="spending-card"
          label="Projected Spend (This Year)"
          value={m.spend.value}
          detailText={m.spend.detail}
          change={m.spend.pct}
          changeIsPercentage={true}
          changeAbsolute={m.spend.diff}
          invertChangeColors={true}
        />

        <MetricCard
          cardId="savings-card"
          label="Savings Rate (This Year)"
          value={m.savings.rate}
          detailText={m.savings.detail}
          change={m.savings.change}
          changeIsPercentage={true}
          valueIsPercentage={true}
        />

        <MetricCard
          cardId="fire-progress-card"
          label="FIRE Progress"
          value="{m.fire.progressPct.toFixed(0)}%"
          subtext={m.fire.progressSubtext}
          detailText={m.fire.runwayDetail}
        />

        <MetricCard
          cardId="fire-date-card"
          label="Projected FIRE Date"
          value={m.fire.dateStr}
          detailText={m.fire.dateDetail}
        />
      </div>

      <div class="chart-container">
        <SWRSensitivityChart data={m.swrData} />
      </div>
    {/snippet}
  </AsyncContent>
</div>

<style>
  .summary-tab {
    width: 100%;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .chart-container {
    margin-top: 24px;
  }
</style>
