<script lang="ts">
  import PlotlyChart, { type ChartSpec, type Trace } from './PlotlyChart.svelte';
  import { getAccountColors } from '$lib/theme';
  import { WITHDRAWAL_ORDER } from '$lib/transforms/fire';
  import type { RetirementDrawdownRow } from '$lib/data/types';

  let { data }: { data: RetirementDrawdownRow[] } = $props();

  const TITLE = 'Annual Retirement Income by Source';

  function build(): ChartSpec {
    const ages = data.map((row) => row.age);

    return {
      traces: WITHDRAWAL_ORDER.map((accountType): Trace => {
        const palette = getAccountColors(accountType);
        return {
          x: ages,
          y: data.map((row) => row.withdrawalsByAccount[accountType]),
          type: 'bar',
          name: accountType,
          marker: { color: palette.fill, line: { width: 1, color: palette.line } },
          hovertemplate: `${accountType}: $%{y:,.0f}<extra></extra>`,
        };
      }),
      layout: {
        title: { text: TITLE, y: 0.98, yanchor: 'top' },
        xaxis: { title: { text: 'Age' } },
        yaxis: { tickprefix: '$' },
        barmode: 'stack',
        margin: { t: 80, r: 24, b: 48, l: 70 },
        showlegend: true,
        legend: { yanchor: 'top', y: 1.12, font: { size: 12 } },
      },
    };
  }
</script>

<PlotlyChart title={TITLE} height={450} empty={data.length === 0} {build} />
