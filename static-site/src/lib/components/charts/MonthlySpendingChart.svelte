<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { getColors, getChartTemplate } from '$lib/theme';
  import { theme } from '$lib/stores/theme.svelte';
  import type { MonthlySpendingRow } from '$lib/data/types';

  interface Props {
    data: MonthlySpendingRow[];
  }

  let { data }: Props = $props();

  let chartElement: HTMLDivElement;

  onDestroy(() => {
    if (chartElement) {
      Plotly.purge(chartElement);
    }
  });

  const hasData = $derived(data.length > 0);

  function renderChart(isDark: boolean) {
    if (!chartElement) return;
    const colors = getColors(isDark);
    const template = getChartTemplate(isDark);

    if (!hasData) {
      const layout: Partial<Plotly.Layout> = {
        ...template,
        title: 'Monthly Spending',
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

    const dates = data.map((row) => row.dates);
    const rawValues = data.map((row) => row.totalUsd);
    const medianValues = data.map((row) => row.medianUsd);

    // Raw data as faded/dotted line
    const rawTrace: Partial<Plotly.PlotData> = {
      x: dates,
      y: rawValues,
      type: 'scatter',
      mode: 'lines',
      name: 'Monthly',
      line: { color: colors.chart1, width: 1, dash: 'dot' },
      opacity: 0.5,
      hovertemplate: '%{x|%b %Y}<br>Monthly: $%{y:,.0f}<extra></extra>',
    };

    // Rolling median as primary solid line with fill
    const medianTrace: Partial<Plotly.PlotData> = {
      x: dates,
      y: medianValues,
      type: 'scatter',
      mode: 'lines',
      name: '4-Month Median',
      line: { color: colors.chart1, width: 2.5 },
      fill: 'tozeroy',
      fillcolor: colors.accentGlow,
      hovertemplate: '%{x|%b %Y}<br>Median: $%{y:,.0f}<extra></extra>',
    };

    const layout: Partial<Plotly.Layout> = {
      ...template,
      title: 'Monthly Spending',
      xaxis: {
        ...template.xaxis,
        title: '',
      },
      yaxis: {
        ...template.yaxis,
        title: '',
        tickprefix: '$',
      },
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.02,
        xanchor: 'left',
        x: 0,
        font: { size: 13, color: colors.textSecondary },
        bgcolor: 'rgba(0,0,0,0)',
      },
      margin: { t: 80, r: 24, b: 48, l: 60 },
      height: 400,
      showlegend: true,
    };

    Plotly.newPlot(chartElement, [rawTrace, medianTrace], layout, { displayModeBar: false });
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
