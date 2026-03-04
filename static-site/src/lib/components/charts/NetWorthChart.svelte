<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { getColors, getChartTemplate } from '$lib/theme';
  import { theme } from '$lib/stores/theme.svelte';
  import type { FireProjectionSeries } from '$lib/data/types';
  import type { CombinedNetworth } from '$lib/data/types';

  interface Props {
    data: FireProjectionSeries;
    combinedData: CombinedNetworth[];
  }

  let { data, combinedData }: Props = $props();

  let chartElement: HTMLDivElement;

  onDestroy(() => {
    if (chartElement) {
      Plotly.purge(chartElement);
    }
  });

  const hasData = $derived(data.historical.length > 0);

  function renderChart(isDark: boolean) {
    if (!chartElement) return;
    const colors = getColors(isDark);
    const template = getChartTemplate(isDark);

    if (!hasData) {
      const layout: Partial<Plotly.Layout> = {
        ...template,
        title: 'Net Worth Over Time',
        annotations: [
          {
            text: 'No data available',
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.5,
            showarrow: false,
            font: { size: 14, color: colors.textSecondary },
          },
        ],
        height: 400,
      };

      Plotly.newPlot(chartElement, [], layout, { displayModeBar: false });
      return;
    }

    const traces: Partial<Plotly.PlotData>[] = [];

    // Total net worth (primary line with fill)
    traces.push({
      x: data.historical.map((p) => p.dates),
      y: data.historical.map((p) => p.totalUsd),
      name: 'Total',
      type: 'scatter',
      mode: 'lines',
      line: { color: colors.chart1, width: 2.5 },
      fill: 'tozeroy',
      fillcolor: colors.accentGlow,
      hovertemplate: '$%{y:,.0f}<extra></extra>',
    });

    // US net worth (secondary dotted line)
    traces.push({
      x: combinedData.map((p) => p.dates),
      y: combinedData.map((p) => p.usUsd),
      name: 'US',
      type: 'scatter',
      mode: 'lines',
      line: { color: colors.chart2, width: 1.5, dash: 'dot' },
      hovertemplate: '$%{y:,.0f}<extra></extra>',
    });

    // UK net worth (secondary dotted line)
    traces.push({
      x: combinedData.map((p) => p.dates),
      y: combinedData.map((p) => p.ukUsd),
      name: 'UK',
      type: 'scatter',
      mode: 'lines',
      line: { color: colors.chart3, width: 1.5, dash: 'dot' },
      hovertemplate: '$%{y:,.0f}<extra></extra>',
    });

    // Projected net worth (dashed line)
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

    // FIRE target threshold (horizontal dotted line)
    const allDates = [
      ...data.historical.map((p) => p.dates),
      ...data.projection.map((p) => p.dates),
    ];
    const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
    const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();

    traces.push({
      x: [minDate, maxDate],
      y: [data.fireGoal, data.fireGoal],
      name: 'FIRE Target',
      type: 'scatter',
      mode: 'lines',
      line: { color: colors.accent, width: 2, dash: 'dot' },
      hovertemplate: 'FIRE Target: $%{y:,.0f}<extra></extra>',
    });

    const layout: Partial<Plotly.Layout> = {
      ...template,
      title: 'Net Worth Over Time',
      xaxis: {
        ...template.xaxis,
        title: '',
      },
      yaxis: {
        ...template.yaxis,
        title: '',
        tickprefix: '$',
      },
      height: 400,
      hovermode: 'x unified',
      legend: {
        ...template.legend,
        font: { ...template.legend.font, size: 13 },
      },
      margin: { t: 80, r: 24, b: 48, l: 60 },
    };

    Plotly.newPlot(chartElement, traces, layout, { displayModeBar: false });
  }

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
    min-height: 400px;
  }
</style>
