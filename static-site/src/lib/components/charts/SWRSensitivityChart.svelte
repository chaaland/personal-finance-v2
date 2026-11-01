<script lang="ts">
  import PlotlyChart, { type ChartContext, type ChartSpec } from './PlotlyChart.svelte';
  import type { SwrSensitivityRow } from '$lib/data/types';

  let { data }: { data: SwrSensitivityRow[] } = $props();

  // Only withdrawal rates for which a FIRE date could be projected
  const validData = $derived(data.filter((row) => row.fireDate !== null));

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  function build({ colors }: ChartContext): ChartSpec {
    const swrLabels = validData.map((row) => row.swr);
    const fireDates = validData.map((row) => row.fireDate as Date);

    return {
      traces: [
        {
          y: swrLabels,
          x: fireDates,
          type: 'bar',
          orientation: 'h',
          marker: { color: colors.chart1 },
          text: fireDates.map(formatMonthYear),
          textposition: 'outside',
          textfont: { size: 12, color: colors.textSecondary },
          hovertext: validData.map(
            (row, i) =>
              `${row.swr}<br>${formatMonthYear(fireDates[i])}<br>${(row.yearsToFire as number).toFixed(1)} years`
          ),
          hoverinfo: 'text',
        },
      ],
      layout: {
        // Lowest SWR (3%) at the bottom
        yaxis: { categoryorder: 'array', categoryarray: [...swrLabels].reverse() },
        showlegend: false,
        margin: { t: 60, r: 80, b: 40, l: 60 },
      },
    };
  }
</script>

<PlotlyChart
  title="FIRE Date by Withdrawal Rate"
  height={250}
  empty={validData.length === 0}
  emptyMessage="Insufficient data to project FIRE dates"
  {build}
/>
