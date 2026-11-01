<script lang="ts">
  import PlotlyChart, { type ChartContext, type ChartSpec } from './PlotlyChart.svelte';
  import type { MonthlySpendingRow } from '$lib/data/types';

  let { data }: { data: MonthlySpendingRow[] } = $props();

  function build({ colors }: ChartContext): ChartSpec {
    const dates = data.map((row) => row.dates);

    return {
      traces: [
        // Raw monthly values as a faded dotted line
        {
          x: dates,
          y: data.map((row) => row.totalUsd),
          type: 'scatter',
          mode: 'lines',
          name: 'Monthly',
          line: { color: colors.chart1, width: 1, dash: 'dot' },
          opacity: 0.5,
          hovertemplate: '%{x|%b %Y}<br>Monthly: $%{y:,.0f}<extra></extra>',
        },
        // Rolling median as the primary solid line with fill
        {
          x: dates,
          y: data.map((row) => row.medianUsd),
          type: 'scatter',
          mode: 'lines',
          name: '4-Month Median',
          line: { color: colors.chart1, width: 2.5 },
          fill: 'tozeroy',
          fillcolor: colors.accentGlow,
          hovertemplate: '%{x|%b %Y}<br>Median: $%{y:,.0f}<extra></extra>',
        },
      ],
      layout: {
        yaxis: { tickprefix: '$' },
        legend: { font: { size: 13 } },
        margin: { t: 80, r: 24, b: 48, l: 60 },
        showlegend: true,
      },
    };
  }
</script>

<PlotlyChart title="Monthly Spending" empty={data.length === 0} {build} />
