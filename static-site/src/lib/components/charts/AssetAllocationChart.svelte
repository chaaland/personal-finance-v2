<script lang="ts">
  import PlotlyChart, { type ChartContext, type ChartSpec } from './PlotlyChart.svelte';

  interface Props {
    data: { label: string; value: number }[];
    title: string;
  }

  let { data, title }: Props = $props();

  function build({ colors }: ChartContext): ChartSpec {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const palette = [
      colors.chart1,
      colors.chart2,
      colors.chart3,
      colors.chart4,
      colors.chart5,
      colors.chart6,
      colors.chart7,
      colors.chart8,
      colors.chart9,
    ];

    return {
      traces: [
        {
          labels: sorted.map((d) => d.label),
          values: sorted.map((d) => d.value),
          type: 'pie',
          hole: 0.55,
          marker: { colors: palette.slice(0, sorted.length) },
          textinfo: 'label+percent',
          textposition: 'outside',
          textfont: { size: 10, color: colors.textSecondary },
          hovertemplate: '<b>%{label}</b><br>$%{value:,.0f}<br>%{percent}<extra></extra>',
          pull: Array(sorted.length).fill(0.02),
        },
      ],
      layout: {
        showlegend: false,
        margin: { t: 60, r: 100, b: 120, l: 100 },
      },
    };
  }
</script>

<PlotlyChart {title} empty={data.length === 0} {build} />
