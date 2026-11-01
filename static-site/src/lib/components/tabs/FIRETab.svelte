<script lang="ts">
  import type Decimal from 'decimal.js';
  import { MetricCard } from '$lib/components/cards';
  import { PortfolioDrawdownChart, WithdrawalSourceChart } from '$lib/components/charts';
  import AsyncContent from '$lib/components/AsyncContent.svelte';
  import {
    getCurrentRunwayYears,
    getProjectedFireDate,
    getRetirementDrawdownSeries,
    formatFireDate,
  } from '$lib/transforms/fire';
  import { settings } from '$lib/stores/settings.svelte';

  async function loadData(fireGoal: Decimal) {
    const [runway, projection, drawdown] = await Promise.all([
      getCurrentRunwayYears(),
      getProjectedFireDate(fireGoal),
      getRetirementDrawdownSeries(fireGoal),
    ]);

    let yearsToFire = 'Insufficient growth data';
    if (projection.yearsToFire === 0) {
      yearsToFire = "You've reached your target!";
    } else if (projection.fireDate !== null) {
      yearsToFire = `${projection.yearsToFire?.toFixed(1)} years from now`;
    }

    return {
      fireGoal: fireGoal.toNumber(),
      runway: `${runway.toNumber().toFixed(1)} years`,
      fireDate: formatFireDate(projection),
      yearsToFire,
      drawdown,
    };
  }

  // Reloads (and shows the loading state) whenever the FIRE goal changes
  const data = $derived(loadData(settings.fireGoal));
</script>

<div class="fire-tab">
  <AsyncContent promise={data} loadingText="Loading FIRE data...">
    {#snippet children(d)}
      <div class="metrics-row">
        <MetricCard label="FIRE Goal" value={d.fireGoal} />
        <MetricCard
          label="Current Runway"
          value={d.runway}
          subtext="if you stopped working today"
        />
        <MetricCard label="Projected FIRE Date" value={d.fireDate} subtext={d.yearsToFire} />
      </div>

      <div class="chart-section">
        <PortfolioDrawdownChart data={d.drawdown} />
      </div>

      <div class="chart-section">
        <WithdrawalSourceChart data={d.drawdown} />
      </div>
    {/snippet}
  </AsyncContent>
</div>

<style>
  .fire-tab {
    width: 100%;
  }

  .metrics-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-bottom: 24px;
  }

  @media (max-width: 768px) {
    .metrics-row {
      grid-template-columns: 1fr;
    }
  }
</style>
