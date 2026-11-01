<script lang="ts">
  import PlotlyChart, { type ChartContext, type ChartSpec, type Trace } from './PlotlyChart.svelte';
  import { formatUsd } from '$lib/theme';
  import type { IncomeByYear } from '$lib/data/types';

  let { data }: { data: IncomeByYear[] } = $props();

  function build({ colors }: ChartContext): ChartSpec {
    const years = data.map((row) => row.year);
    const bars = (name: string, values: number[], color: string): Trace => ({
      x: years,
      y: values,
      type: 'bar',
      name,
      marker: { color },
      text: values.map(formatUsd),
      textposition: 'outside',
      textfont: { size: 14, color: colors.textSecondary },
      hovertemplate: `%{x}<br>${name}: $%{y:,.0f}<extra></extra>`,
    });

    const gross = data.map((row) => row.grossUsd);
    const net = data.map((row) => row.netUsd);

    return {
      traces: [bars('Gross', gross, colors.chart1), bars('Net', net, colors.chart2)],
      layout: {
        xaxis: { tickmode: 'linear', dtick: 1 },
        yaxis: { tickprefix: '$', range: [0, Math.max(...gross) * 1.15] },
        barmode: 'group',
        legend: { font: { size: 13 } },
        margin: { t: 80, r: 24, b: 48, l: 60 },
        showlegend: true,
      },
    };
  }
</script>

<PlotlyChart title="Annual Income" empty={data.length === 0} {build} />
