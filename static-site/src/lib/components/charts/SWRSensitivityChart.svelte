<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { getColors, getChartTemplate } from '$lib/theme';
  import { theme } from '$lib/stores/theme.svelte';
  import type { SwrSensitivityRow } from '$lib/data/types';

  interface Props {
    data: SwrSensitivityRow[];
  }

  let { data }: Props = $props();

  let chartElement: HTMLDivElement;

  // Cleanup Plotly chart on component unmount to prevent memory leaks
  onDestroy(() => {
    if (chartElement) {
      Plotly.purge(chartElement);
    }
  });

  // Filter to only valid data (non-null fire dates)
  const validData = $derived(data.filter((row) => row.fireDate !== null));

  const hasValidData = $derived(validData.length > 0);

  function renderChart(isDark: boolean) {
    if (!chartElement) return;
    const colors = getColors(isDark);
    const template = getChartTemplate(isDark);

    if (!hasValidData) {
      // Show "insufficient data" message
      const layout: Partial<Plotly.Layout> = {
        ...template,
        title: 'FIRE Date by Withdrawal Rate',
        annotations: [
          {
            text: 'Insufficient data to project FIRE dates',
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.5,
            showarrow: false,
            font: { size: 14, color: colors.textSecondary },
          },
        ],
        height: 250,
      };

      Plotly.newPlot(chartElement, [], layout, { displayModeBar: false });
      return;
    }

    // Extract data for chart
    const swrLabels = validData.map((row) => row.swr);
    const fireDates = validData.map((row) => row.fireDate as Date);
    const yearsToFire = validData.map((row) => row.yearsToFire as number);

    // Format text labels for outside bars (Jan 2030 format)
    const textLabels = fireDates.map((date) =>
      date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    );

    // Format hover text
    const hoverText = swrLabels.map((label, i) => {
      const date = fireDates[i];
      const years = yearsToFire[i];
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return `${label}<br>${dateStr}<br>${years.toFixed(1)} years`;
    });

    const trace: Partial<Plotly.PlotData> = {
      y: swrLabels,
      x: fireDates,
      type: 'bar',
      orientation: 'h',
      marker: { color: colors.chart1 },
      text: textLabels,
      textposition: 'outside',
      textfont: { size: 12, color: colors.textSecondary },
      hovertext: hoverText,
      hoverinfo: 'text',
    };

    const layout: Partial<Plotly.Layout> = {
      ...template,
      title: 'FIRE Date by Withdrawal Rate',
      xaxis: {
        ...template.xaxis,
        title: '',
      },
      yaxis: {
        ...template.yaxis,
        title: '',
        categoryorder: 'array',
        categoryarray: [...swrLabels].reverse(), // Lowest SWR (3%) at bottom
      },
      height: 250,
      showlegend: false,
      margin: { t: 60, r: 80, b: 40, l: 60 },
    };

    Plotly.newPlot(chartElement, [trace], layout, { displayModeBar: false });
  }

  // Render chart on mount and when data changes
  $effect(() => {
    if (chartElement && data) {
      renderChart(theme.isDark);
    }
  });
</script>

<div class="chart-container" bind:this={chartElement}></div>

<style>
  .chart-container {
    width: 100%;
    min-height: 250px;
  }
</style>
