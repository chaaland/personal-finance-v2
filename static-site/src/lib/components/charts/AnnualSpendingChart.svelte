<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { COLORS, CHART_TEMPLATE } from '$lib/theme';
  import type { SpendingByYear } from '$lib/data/types';

  interface Props {
    data: SpendingByYear[];
  }

  let { data }: Props = $props();

  let chartElement: HTMLDivElement;

  onDestroy(() => {
    if (chartElement) {
      Plotly.purge(chartElement);
    }
  });

  const hasData = $derived(data.length > 0);

  function renderChart() {
    if (!chartElement) return;

    if (!hasData) {
      const layout: Partial<Plotly.Layout> = {
        ...CHART_TEMPLATE,
        title: 'Annual Spending',
        annotations: [
          {
            text: 'No data available',
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.5,
            showarrow: false,
            font: { size: 14, color: COLORS.textSecondary },
          },
        ],
        height: 400,
      };

      Plotly.newPlot(chartElement, [], layout, { displayModeBar: false });
      return;
    }

    const years = data.map((row) => row.year);
    const values = data.map((row) => row.totalUsd);
    const maxValue = Math.max(...values);

    const trace: Partial<Plotly.PlotData> = {
      x: years,
      y: values,
      type: 'bar',
      marker: { color: COLORS.chart1 },
      text: values.map((v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`),
      textposition: 'outside',
      textfont: { size: 14, color: COLORS.textSecondary },
      hovertemplate: '%{x}<br>$%{y:,.0f}<extra></extra>',
    };

    const layout: Partial<Plotly.Layout> = {
      ...CHART_TEMPLATE,
      title: 'Annual Spending',
      xaxis: {
        ...CHART_TEMPLATE.xaxis,
        title: '',
        tickmode: 'linear',
        dtick: 1,
      },
      yaxis: {
        ...CHART_TEMPLATE.yaxis,
        title: '',
        tickprefix: '$',
        range: [0, maxValue * 1.15],
      },
      margin: { t: 60, r: 24, b: 48, l: 60 },
      height: 400,
      showlegend: false,
    };

    Plotly.newPlot(chartElement, [trace], layout, { displayModeBar: false });
  }

  $effect(() => {
    if (chartElement && data) {
      renderChart();
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
