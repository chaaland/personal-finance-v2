<script lang="ts">
  import type Decimal from 'decimal.js';
  import { MetricCard } from '$lib/components/cards';
  import { PortfolioDrawdownChart, WithdrawalSourceChart } from '$lib/components/charts';
  import AsyncContent from '$lib/components/AsyncContent.svelte';
  import { getCurrentRunwayYears, getRetirementDrawdownSeries } from '$lib/transforms/fire';
  import { getFireProjection } from '$lib/transforms/projection';
  import { formatFireDate, formatFireRange, formatAssumptions } from '$lib/transforms/projection-format';
  import { settings } from '$lib/stores/settings.svelte';

  async function loadData(fireGoal: Decimal, expectedRealReturn: number) {
    const [runway, projection, drawdown] = await Promise.all([
      getCurrentRunwayYears(),
      getFireProjection(fireGoal, expectedRealReturn),
      getRetirementDrawdownSeries(fireGoal),
    ]);

    return {
      fireGoal: fireGoal.toNumber(),
      runway: `${runway.toNumber().toFixed(1)} years`,
      fireDate: formatFireDate(projection.estimate),
      fireRange: formatFireRange(projection.estimate),
      assumptions: formatAssumptions(projection.assumptions),
      drawdown,
    };
  }

  // Reloads (and shows the loading state) whenever the FIRE goal or expected return changes
  const data = $derived(loadData(settings.fireGoal, settings.expectedRealReturn));
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
        <MetricCard label="Projected FIRE Date" value={d.fireDate} subtext={d.fireRange} />
      </div>
      <p class="assumptions">{d.assumptions}.</p>

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

  .assumptions {
    margin: -8px 0 24px 0;
    font-size: 13px;
    color: var(--color-text-muted);
  }

  @media (max-width: 768px) {
    .metrics-row {
      grid-template-columns: 1fr;
    }
  }
</style>
