<script lang="ts">
  import PlotlyChart, { type ChartContext, type ChartSpec } from './PlotlyChart.svelte';
  import { withAlpha } from '$lib/theme';
  import type { CombinedNetworth, NetWorthBand } from '$lib/data/types';

  interface Props {
    combinedData: CombinedNetworth[];
    /** Projected net worth percentiles, in today's dollars. */
    band: NetWorthBand;
    fireGoal: number;
  }

  let { combinedData, band, fireGoal }: Props = $props();

  function build({ colors }: ChartContext): ChartSpec {
    const dates = combinedData.map((p) => p.dates);
    const hover = '$%{y:,.0f}<extra></extra>';
    const edge = withAlpha(colors.accent, 0.8);

    return {
      traces: [
        // Total net worth: primary line with fill
        {
          x: dates,
          y: combinedData.map((p) => p.totalUsd),
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
          x: dates,
          y: combinedData.map((p) => p.usUsd),
          name: 'US',
          type: 'scatter',
          mode: 'lines',
          line: { color: colors.chart2, width: 1.5, dash: 'dot' },
          hovertemplate: hover,
        },
        {
          x: dates,
          y: combinedData.map((p) => p.ukUsd),
          name: 'UK',
          type: 'scatter',
          mode: 'lines',
          line: { color: colors.chart3, width: 1.5, dash: 'dot' },
          hovertemplate: hover,
        },
        // Projected 10th-90th percentile range: lower edge first, upper edge fills down to it.
        // Dotted edges and a firm fill keep the range visible on both light and dark themes.
        {
          x: band.dates,
          y: band.p10,
          type: 'scatter',
          mode: 'lines',
          line: { color: edge, width: 1, dash: 'dot' },
          showlegend: false,
          hovertemplate: '$%{y:,.0f} (10th percentile)<extra></extra>',
        },
        {
          x: band.dates,
          y: band.p90,
          name: 'Projected 10th–90th percentile',
          type: 'scatter',
          mode: 'lines',
          line: { color: edge, width: 1, dash: 'dot' },
          fill: 'tonexty',
          fillcolor: withAlpha(colors.accent, 0.28),
          hovertemplate: '$%{y:,.0f} (90th percentile)<extra></extra>',
        },
        // Projected median (today's dollars)
        {
          x: band.dates,
          y: band.p50,
          name: 'Projected median',
          type: 'scatter',
          mode: 'lines',
          line: { color: colors.chart1, width: 2, dash: 'dash' },
          hovertemplate: '$%{y:,.0f} (projected median)<extra></extra>',
        },
        // FIRE target: horizontal dotted line spanning all dates
        {
          x: [dates[0], band.dates[band.dates.length - 1]],
          y: [fireGoal, fireGoal],
          name: 'FIRE Target',
          type: 'scatter',
          mode: 'lines',
          line: { color: colors.accent, width: 2, dash: 'dot' },
          hovertemplate: 'FIRE Target: $%{y:,.0f}<extra></extra>',
        },
      ],
      layout: {
        yaxis: { tickprefix: '$' },
        hovermode: 'x unified',
        legend: { font: { size: 13 } },
        margin: { t: 80, r: 24, b: 48, l: 60 },
      },
    };
  }
</script>

<PlotlyChart title="Net Worth Over Time" empty={combinedData.length === 0} {build} />
