<script lang="ts">
  import PlotlyChart, { type ChartContext, type ChartSpec } from './PlotlyChart.svelte';
  import type { YoyNetworthChange } from '$lib/data/types';

  let { data }: { data: YoyNetworthChange[] } = $props();

  function build({ colors }: ChartContext): ChartSpec {
    const changes = data.map((row) => row.change);
    const minVal = Math.min(...changes);
    const maxVal = Math.max(...changes);

    return {
      traces: [
        {
          x: data.map((row) => row.year),
          y: changes,
          type: 'bar',
          marker: { color: changes.map((c) => (c >= 0 ? colors.positive : colors.negative)) },
          text: changes.map((c) => `${c >= 0 ? '+' : ''}$${(c / 1000).toFixed(0)}K`),
          textposition: 'outside',
          textfont: { size: 14, color: colors.textSecondary },
          hovertemplate: '%{x}<br>$%{y:,.0f}<extra></extra>',
        },
      ],
      layout: {
        xaxis: { tickmode: 'linear', dtick: 1 },
        yaxis: { tickprefix: '$', range: [minVal < 0 ? minVal * 1.15 : 0, maxVal * 1.15] },
        showlegend: false,
      },
    };
  }
</script>

<PlotlyChart title="Year-over-Year Change" height={300} empty={data.length === 0} {build} />
