<script lang="ts">
  import PlotlyChart, { type ChartContext, type ChartSpec } from './PlotlyChart.svelte';
  import { formatUsd } from '$lib/theme';
  import type { SpendingByYear } from '$lib/data/types';

  interface Props {
    data: SpendingByYear[];
    projectedSpend?: number;
  }

  let { data, projectedSpend }: Props = $props();

  function build({ colors }: ChartContext): ChartSpec {
    const maxYear = Math.max(...data.map((r) => r.year));
    const currentYearActual = data.find((r) => r.year === maxYear);
    const projectedValue = projectedSpend ?? currentYearActual?.totalUsd ?? 0;
    const maxValue = Math.max(...data.map((r) => r.totalUsd), projectedValue);

    return {
      traces: [
        // Projected bar drawn first so it sits behind the actual bar
        {
          x: [maxYear],
          y: [projectedValue],
          type: 'bar',
          name: 'Projected',
          showlegend: true,
          opacity: 0.35,
          marker: { color: colors.chart1 },
          text: [`${formatUsd(projectedValue)} est.`],
          textposition: 'outside',
          textfont: { size: 14, color: colors.textSecondary },
          hovertemplate: `${maxYear} (Projected)<br>$%{y:,.0f}<extra></extra>`,
        },
        // Actual bars on top; the current year has no label (the projected label covers it)
        {
          x: data.map((r) => r.year),
          y: data.map((r) => r.totalUsd),
          type: 'bar',
          name: 'Actual',
          showlegend: false,
          marker: { color: colors.chart1 },
          text: data.map((r) => (r.year < maxYear ? formatUsd(r.totalUsd) : '')),
          textposition: 'outside',
          textfont: { size: 14, color: colors.textSecondary },
          hovertemplate: '%{x}<br>$%{y:,.0f}<extra></extra>',
        },
      ],
      layout: {
        barmode: 'overlay',
        xaxis: { tickmode: 'linear', dtick: 1 },
        yaxis: { tickprefix: '$', range: [0, maxValue * 1.2] },
        showlegend: true,
      },
    };
  }
</script>

<PlotlyChart title="Annual Spending" empty={data.length === 0} {build} />
