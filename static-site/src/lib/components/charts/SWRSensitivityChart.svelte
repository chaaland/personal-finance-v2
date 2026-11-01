<script lang="ts">
  import PlotlyChart, { type ChartContext, type ChartSpec, type Trace } from './PlotlyChart.svelte';
  import { monthYear } from '$lib/transforms/projection-format';
  import type { SwrSensitivityRow } from '$lib/data/types';

  let { data }: { data: SwrSensitivityRow[] } = $props();

  // Only withdrawal rates for which a median FIRE date could be projected
  const validData = $derived(data.filter((row) => row.estimate.medianDate !== null));

  function build({ colors }: ChartContext): ChartSpec {
    const swrLabels = validData.map((row) => row.swr);
    const median = validData.map((row) => row.estimate.medianDate as Date);

    // Likely range (10th to 90th percentile) as a line per withdrawal rate. When the 90th
    // percentile is beyond the 30-year horizon the line stops at the median; the hover says so.
    const ranges = validData.map((row, i): Trace => ({
      x: [row.estimate.earlyDate ?? median[i], row.estimate.lateDate ?? median[i]],
      y: [row.swr, row.swr],
      type: 'scatter',
      mode: 'lines',
      line: { color: colors.chart1, width: 10 },
      opacity: 0.4,
      showlegend: false,
      hoverinfo: 'skip',
    }));

    const medians: Trace = {
      x: median,
      y: swrLabels,
      type: 'scatter',
      mode: 'text+markers',
      marker: { color: colors.chart1, size: 13 },
      text: median.map(monthYear),
      textposition: 'top center',
      textfont: { size: 12, color: colors.textSecondary },
      hovertext: validData.map((row, i) => {
        const { earlyDate, lateDate, medianYears } = row.estimate;
        const range = `${earlyDate ? monthYear(earlyDate) : '?'} to ${lateDate ? monthYear(lateDate) : 'beyond 30 years'}`;
        return `${row.swr} withdrawal rate<br>Median ${monthYear(median[i])} (${(medianYears ?? 0).toFixed(1)} years)<br>Likely ${range}`;
      }),
      hoverinfo: 'text',
      showlegend: false,
    };

    return {
      traces: [...ranges, medians],
      layout: {
        // Lowest SWR (3%) at the bottom
        // Headroom above the top row so its date label is not clipped
        yaxis: {
          type: 'category',
          categoryorder: 'array',
          categoryarray: [...swrLabels].reverse(),
          range: [-0.5, validData.length - 0.05],
        },
        showlegend: false,
        margin: { t: 60, r: 40, b: 40, l: 60 },
      },
    };
  }
</script>

<PlotlyChart
  title="FIRE Date by Withdrawal Rate (median and likely range)"
  height={250}
  empty={validData.length === 0}
  emptyMessage="Insufficient data to project FIRE dates"
  {build}
/>
