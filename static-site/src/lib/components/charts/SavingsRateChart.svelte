<script lang="ts">
  import PlotlyChart, { type ChartContext, type ChartSpec } from './PlotlyChart.svelte';
  import type { SavingsRateByYear } from '$lib/data/types';

  let { data }: { data: SavingsRateByYear[] } = $props();

  function build({ colors }: ChartContext): ChartSpec {
    const rates = data.map((row) => row.savingsRate);

    return {
      traces: [
        {
          x: data.map((row) => row.year),
          y: rates,
          type: 'bar',
          // Positive = green, negative = red
          marker: { color: rates.map((rate) => (rate >= 0 ? colors.positive : colors.negative)) },
          text: rates.map((r) => `${r.toFixed(1)}%`),
          textposition: 'outside',
          textfont: { size: 14, color: colors.textSecondary },
          hovertemplate: '%{x}<br>%{y:.1f}%<extra></extra>',
        },
      ],
      layout: {
        xaxis: { tickmode: 'linear', dtick: 1 },
        yaxis: { ticksuffix: '%', range: [0, 100] },
        showlegend: false,
      },
    };
  }
</script>

<PlotlyChart title="Savings Rate by Year" empty={data.length === 0} {build} />
