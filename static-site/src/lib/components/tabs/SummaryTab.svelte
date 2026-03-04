<script lang="ts">
  import Decimal from 'decimal.js';
  import { ExpandableCard, FIREProgressCard, FIREDateCard } from '$lib/components/cards';
  import { SWRSensitivityChart } from '$lib/components/charts';
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
  import {
    getFireProgressPct,
    getProjectedFireDate,
    getCurrentRunwayYears,
    getSwrSensitivity,
  } from '$lib/transforms/fire';
  import type { SwrSensitivityRow } from '$lib/data/types';

  // State for loading, error, and metrics
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Net worth metrics
  let currentNetworth = $state(0);
  let ytdNwChange = $state(0);
  let ytdNwPct = $state(0);
  let nwDetailsText = $state('');

  // Income metrics
  let ytdGross = $state(0);
  let yoyIncomeDiff = $state(0);
  let yoyIncomePct = $state(0);
  let incomeDetailsText = $state('');

  // Spending metrics
  let projectedSpend = $state(0);
  let yoySpendDiff = $state(0);
  let yoySpendPct = $state(0);
  let spendDetailsText = $state('');

  // Savings metrics
  let savingsRate = $state(0);
  let savingsChange = $state(0);
  let savingsDetailsText = $state('');

  // FIRE metrics
  let fireProgress = $state(0);
  let runwayYears = $state(0);
  let fireDateStr = $state('');
  let yearsRemainingStr = $state('');
  let swrSensitivityData = $state<SwrSensitivityRow[]>([]);

  // Load all metrics, parameterised so $effect can pass the current fireGoal
  async function loadMetrics(fireGoal: typeof settings.fireGoal) {
    loading = true;
    error = null;

    try {
      // Load ALL metrics in parallel with one outer Promise.all
      const [
        [nwValue, [nwChange, nwPct], nwDetails],
        [incomeValue, [incomeDiff, incomePct], incomeDetails],
        [spendValue, [spendDiff, spendPct], spendDetails],
        [rateValue, savingsDetails],
        [progressValue, projection, runway, swrData],
      ] = await Promise.all([
        Promise.all([getCurrentNetworth(), getYtdNetworthChange(), getYtdNetworthDetails()]),
        Promise.all([getYtdGrossIncome(), getYoyIncomeComparison(), getYtdIncomeDetails()]),
        Promise.all([getProjectedAnnualSpend(), getYoySpendingComparison(), getSpendingProjectionDetails()]),
        Promise.all([getCurrentYearSavingsRate(), getSavingsRateDetails()]),
        Promise.all([
          getFireProgressPct(fireGoal),
          getProjectedFireDate(fireGoal, 3),
          getCurrentRunwayYears(),
          getSwrSensitivity([0.03, 0.035, 0.04, 0.045], 3, fireGoal, new Decimal('0.04')),
        ]),
      ]);

      // Net worth
      currentNetworth = nwValue.toNumber();
      ytdNwChange = nwChange.toNumber();
      ytdNwPct = nwPct.toNumber();
      nwDetailsText = formatNetworthExplanation(nwDetails);

      // Income
      ytdGross = incomeValue.toNumber();
      yoyIncomeDiff = incomeDiff.toNumber();
      yoyIncomePct = incomePct.toNumber();
      incomeDetailsText = formatIncomeExplanation(incomeDetails);

      // Spending
      projectedSpend = spendValue.toNumber();
      yoySpendDiff = spendDiff.toNumber();
      yoySpendPct = spendPct.toNumber();
      spendDetailsText = formatSpendingExplanation(spendDetails);

      // Savings
      savingsRate = rateValue.toNumber();
      savingsChange = savingsDetails.change;
      savingsDetailsText = formatSavingsExplanation(savingsDetails);

      // FIRE metrics
      fireProgress = progressValue.toNumber();
      runwayYears = runway.toNumber();
      swrSensitivityData = swrData;

      // Format FIRE date
      if (projection.yearsToFire === 0) {
        fireDateStr = 'FIRE Ready';
        yearsRemainingStr = 'Target reached!';
      } else if (projection.fireDate !== null && projection.yearsToFire !== null) {
        fireDateStr = projection.fireDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        yearsRemainingStr = `${projection.yearsToFire.toFixed(1)} years at current pace of ${formatCurrency(projection.annualNwGrowth)}/yr`;
      } else {
        fireDateStr = 'N/A';
        yearsRemainingStr = 'Insufficient data';
      }
    } catch (err) {
      console.error('Error loading summary metrics:', err);
      error = err instanceof Error ? err.message : 'Failed to load metrics';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    const fireGoal = settings.fireGoal;
    loadMetrics(fireGoal);
  });
</script>

<div class="summary-tab">
  {#if loading}
    <div class="loading">Loading metrics...</div>
  {:else if error}
    <div class="error">
      <p>Error loading metrics: {error}</p>
    </div>
  {:else}
    <!-- Metrics grid -->
    <div class="metrics-grid">
      <!-- Row 1 -->
      <ExpandableCard
        cardId="networth-card"
        label="Current Net Worth"
        value={currentNetworth}
        detailText={nwDetailsText}
        change={ytdNwPct}
        changeIsPercentage={true}
        changeAbsolute={ytdNwChange}
      />

      <ExpandableCard
        cardId="income-card"
        label="Total Comp (YTD)"
        value={ytdGross}
        detailText={incomeDetailsText}
        change={yoyIncomePct}
        changeIsPercentage={true}
        changeAbsolute={yoyIncomeDiff}
      />

      <ExpandableCard
        cardId="spending-card"
        label="Projected Spend (This Year)"
        value={projectedSpend}
        detailText={spendDetailsText}
        change={yoySpendPct}
        changeIsPercentage={true}
        changeAbsolute={yoySpendDiff}
        invertChangeColors={true}
      />

      <!-- Row 2 -->
      <ExpandableCard
        cardId="savings-card"
        label="Savings Rate (This Year)"
        value={savingsRate}
        detailText={savingsDetailsText}
        change={savingsChange}
        changeIsPercentage={true}
        valueIsPercentage={true}
      />

      <FIREProgressCard
        cardId="fire-progress-card"
        label="FIRE Progress"
        progressPct={fireProgress}
        currentValue={currentNetworth}
        targetValue={settings.fireGoal.toNumber()}
        runwayYears={runwayYears}
        projectedSpend={projectedSpend}
      />

      <FIREDateCard
        cardId="fire-date-card"
        label="Projected FIRE Date"
        fireDateStr={fireDateStr}
        yearsRemainingStr={yearsRemainingStr}
      />
    </div>

    <!-- SWR Sensitivity Chart -->
    <div class="chart-container">
      <SWRSensitivityChart data={swrSensitivityData} />
    </div>
  {/if}
</div>

<style>
  .summary-tab {
    width: 100%;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    font-size: 16px;
    color: var(--color-text-secondary);
  }

  .error {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    font-size: 16px;
    color: var(--color-negative);
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
