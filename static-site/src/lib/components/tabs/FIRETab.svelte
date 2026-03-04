<script lang="ts">
  import { PortfolioDrawdownChart, WithdrawalSourceChart } from '$lib/components/charts';
  import {
    getCurrentRunwayYears,
    getProjectedFireDate,
    getRetirementDrawdownSeries,
  } from '$lib/transforms/fire';
  import { formatCurrency } from '$lib/theme';
  import { settings } from '$lib/stores/settings.svelte';
  import type { RetirementDrawdownRow } from '$lib/data/types';

  // State
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Metrics
  let runwayYears = $state(0);
  let fireDateStr = $state('');
  let yearsToFireStr = $state('');

  // Chart data
  let drawdownData = $state<RetirementDrawdownRow[]>([]);

  async function loadData(fireGoal: typeof settings.fireGoal) {
    loading = true;
    error = null;

    try {
      const [runway, projection, drawdown] = await Promise.all([
        getCurrentRunwayYears(),
        getProjectedFireDate(fireGoal),
        getRetirementDrawdownSeries(fireGoal),
      ]);

      runwayYears = runway.toNumber();
      drawdownData = drawdown;

      // Format FIRE date
      if (projection.yearsToFire === 0) {
        fireDateStr = 'FIRE Ready';
        yearsToFireStr = "You've reached your target!";
      } else if (projection.fireDate !== null) {
        fireDateStr = projection.fireDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        yearsToFireStr = `${projection.yearsToFire?.toFixed(1)} years from now`;
      } else {
        fireDateStr = 'N/A';
        yearsToFireStr = 'Insufficient growth data';
      }
    } catch (err) {
      console.error('Error loading FIRE tab:', err);
      error = err instanceof Error ? err.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    const fireGoal = settings.fireGoal;
    loadData(fireGoal);
  });
</script>

<div class="fire-tab">
  {#if loading}
    <div class="loading">Loading FIRE data...</div>
  {:else if error}
    <div class="error">
      <p>Error loading data: {error}</p>
    </div>
  {:else}
    <!-- Metrics row - 3 cards -->
    <div class="metrics-row">
      <!-- FIRE Goal card -->
      <div class="metric-card">
        <p class="metric-label">FIRE Goal</p>
        <p class="metric-value">{formatCurrency(settings.fireGoal)}</p>
      </div>

      <!-- Current Runway card -->
      <div class="metric-card">
        <p class="metric-label">Current Runway</p>
        <p class="metric-value">{runwayYears.toFixed(1)} years</p>
        <p class="metric-subtext">if you stopped working today</p>
      </div>

      <!-- Projected FIRE Date card -->
      <div class="metric-card">
        <p class="metric-label">Projected FIRE Date</p>
        <p class="metric-value">{fireDateStr}</p>
        <p class="metric-subtext">{yearsToFireStr}</p>
      </div>
    </div>

    <!-- Portfolio Drawdown Chart -->
    <div class="chart-section">
      <PortfolioDrawdownChart data={drawdownData} />
    </div>

    <!-- Withdrawal Source Chart -->
    <div class="chart-section">
      <WithdrawalSourceChart data={drawdownData} />
    </div>
  {/if}
</div>

<style>
  .fire-tab {
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
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-bottom: 24px;
  }

  .metric-card {
    background: var(--color-card);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid var(--color-border);
    border-top: 3px solid var(--color-accent);
  }

  .metric-label {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 0 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .metric-value {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 500;
    color: var(--color-text-primary);
    margin: 0;
  }

  .metric-subtext {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin: 8px 0 0 0;
  }

  .chart-section {
    background: var(--color-card);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
    border: 1px solid var(--color-border);
  }

  @media (max-width: 768px) {
    .metrics-row {
      grid-template-columns: 1fr;
    }
  }
</style>
