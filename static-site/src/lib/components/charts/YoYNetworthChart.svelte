<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { getColors, getChartTemplate } from '$lib/theme';
  import { theme } from '$lib/stores/theme.svelte';
  import type { YoyNetworthChange } from '$lib/data/types';

  interface Props {
    data: YoyNetworthChange[];
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
        title: 'Year-over-Year Change',
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
        height: 300,
      };

      Plotly.newPlot(chartElement, [], layout, { displayModeBar: false });
      return;
    }

    const years = data.map((row) => row.year);
    const changes = data.map((row) => row.change);
    const barColors = changes.map((c) => (c >= 0 ? colors.positive : colors.negative));
    const textLabels = changes.map((c) => {
      const sign = c >= 0 ? '+' : '';
      return `${sign}$${(c / 1000).toFixed(0)}K`;
    });

    const maxVal = Math.max(...changes);
    const minVal = Math.min(...changes);

    const trace: Partial<Plotly.PlotData> = {
      x: years,
      y: changes,
      type: 'bar',
      marker: { color: barColors },
      text: textLabels,
      textposition: 'outside',
      textfont: { size: 14, color: colors.textSecondary },
      hovertemplate: '%{x}<br>$%{y:,.0f}<extra></extra>',
    };

    const layout: Partial<Plotly.Layout> = {
      ...template,
      title: 'Year-over-Year Change',
      xaxis: {
        ...template.xaxis,
        title: '',
        tickmode: 'linear',
        dtick: 1,
      },
      yaxis: {
        ...template.yaxis,
        title: '',
        tickprefix: '$',
        range: [minVal < 0 ? minVal * 1.15 : 0, maxVal * 1.15],
      },
      height: 300,
      showlegend: false,
    };

    Plotly.newPlot(chartElement, [trace], layout, { displayModeBar: false });
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
    min-height: 300px;
  }
</style>
