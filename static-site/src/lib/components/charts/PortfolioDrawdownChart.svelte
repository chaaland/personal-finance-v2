<script lang="ts">
  import PlotlyChart, { type ChartSpec, type Trace } from './PlotlyChart.svelte';
  import { getAccountColors } from '$lib/theme';
  import { WITHDRAWAL_ORDER } from '$lib/transforms/fire';
  import type { RetirementDrawdownRow } from '$lib/data/types';

  let { data }: { data: RetirementDrawdownRow[] } = $props();

  const TITLE = 'Portfolio Balance During Retirement';

  function build(): ChartSpec {
    const ages = data.map((row) => row.age);

    // Stacked areas per account, in reverse order so the first account depleted is on top
    const accountTraces = [...WITHDRAWAL_ORDER].reverse().map((accountType): Trace => {
      const palette = getAccountColors(accountType);
      return {
        x: ages,
        y: data.map((row) => row.balances[accountType]),
        mode: 'lines',
        name: accountType,
        stackgroup: 'one',
        line: { width: 1.5, color: palette.line },
        fillcolor: palette.fill,
        hovertemplate: '$%{y:,.0f}',
      };
    });

    // Invisible trace so the unified hover also shows the total and the withdrawal
    const totalTrace: Trace = {
      x: ages,
      y: data.map((row) => row.totalBalance),
      mode: 'lines',
      name: 'Total',
      line: { width: 0, color: 'rgba(0,0,0,0)' },
      customdata: data.map((row) => row.withdrawal),
      hovertemplate: '<b>Total: $%{y:,.0f}</b><br>Withdrawal: $%{customdata:,.0f}',
      showlegend: false,
    };

    return {
      traces: [...accountTraces, totalTrace],
      layout: {
        title: { text: TITLE, y: 0.98, yanchor: 'top' },
        xaxis: { title: { text: 'Age' } },
        yaxis: { tickprefix: '$' },
        margin: { t: 80, r: 24, b: 48, l: 70 },
        showlegend: true,
        legend: { yanchor: 'top', y: 1.12, font: { size: 12 } },
        hovermode: 'x unified',
      },
    };
  }
</script>

<PlotlyChart title={TITLE} height={450} empty={data.length === 0} {build} />
