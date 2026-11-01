<script lang="ts">
  import PlotlyChart, { type ChartContext, type ChartSpec } from './PlotlyChart.svelte';
  import type { FireProjectionSeries, CombinedNetworth } from '$lib/data/types';

  interface Props {
    data: FireProjectionSeries;
    combinedData: CombinedNetworth[];
  }

  let { data, combinedData }: Props = $props();

  function build({ colors }: ChartContext): ChartSpec {
    const combinedDates = combinedData.map((p) => p.dates);
    const hover = '$%{y:,.0f}<extra></extra>';

    const traces: ChartSpec['traces'] = [
      // Total net worth: primary line with fill
      {
        x: data.historical.map((p) => p.dates),
        y: data.historical.map((p) => p.totalUsd),
        name: 'Total',
        type: 'scatter',
        mode: 'lines',
        line: { color: colors.chart1, width: 2.5 },
        fill: 'tozeroy',
        fillcolor: colors.accentGlow,
        hovertemplate: hover,
      },
      // US and UK: secondary dotted lines
      {
        x: combinedDates,
        y: combinedData.map((p) => p.usUsd),
        name: 'US',
        type: 'scatter',
        mode: 'lines',
        line: { color: colors.chart2, width: 1.5, dash: 'dot' },
        hovertemplate: hover,
      },
      {
        x: combinedDates,
        y: combinedData.map((p) => p.ukUsd),
        name: 'UK',
        type: 'scatter',
        mode: 'lines',
        line: { color: colors.chart3, width: 1.5, dash: 'dot' },
        hovertemplate: hover,
      },
    ];

    // Projected net worth: dashed line
    if (data.projection.length > 0) {
      traces.push({
        x: data.projection.map((p) => p.dates),
        y: data.projection.map((p) => p.totalUsd),
        name: 'Projected',
        type: 'scatter',
        mode: 'lines',
        line: { color: colors.chart1, width: 2, dash: 'dash' },
        hovertemplate: '$%{y:,.0f} (projected)<extra></extra>',
      });
    }

    // FIRE target: horizontal dotted line spanning all dates
    const times = [...data.historical, ...data.projection].map((p) => p.dates.getTime());
    traces.push({
      x: [new Date(Math.min(...times)), new Date(Math.max(...times))],
      y: [data.fireGoal, data.fireGoal],
      name: 'FIRE Target',
      type: 'scatter',
      mode: 'lines',
      line: { color: colors.accent, width: 2, dash: 'dot' },
      hovertemplate: 'FIRE Target: $%{y:,.0f}<extra></extra>',
    });

    return {
      traces,
      layout: {
        yaxis: { tickprefix: '$' },
        hovermode: 'x unified',
        legend: { font: { size: 13 } },
        margin: { t: 80, r: 24, b: 48, l: 60 },
      },
    };
  }
</script>

<PlotlyChart title="Net Worth Over Time" empty={data.historical.length === 0} {build} />
