<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { COLORS, CHART_TEMPLATE } from '$lib/theme';
  import type { SavingsRateByYear } from '$lib/data/types';

  interface Props {
    data: SavingsRateByYear[];
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
        title: 'Savings Rate by Year',
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
    const rates = data.map((row) => row.savingsRate);

    // Conditional colors: positive = green, negative = red
    const colors = rates.map((rate) => (rate >= 0 ? COLORS.positive : COLORS.negative));

    const trace: Partial<Plotly.PlotData> = {
      x: years,
      y: rates,
      type: 'bar',
      marker: { color: colors },
      text: rates.map((r) => `${r.toFixed(1)}%`),
      textposition: 'outside',
      textfont: { size: 14, color: COLORS.textSecondary },
      hovertemplate: '%{x}<br>%{y:.1f}%<extra></extra>',
    };

    const layout: Partial<Plotly.Layout> = {
      ...CHART_TEMPLATE,
      title: 'Savings Rate by Year',
      xaxis: {
        ...CHART_TEMPLATE.xaxis,
        title: '',
        tickmode: 'linear',
        dtick: 1,
      },
      yaxis: {
        ...CHART_TEMPLATE.yaxis,
        title: '',
        ticksuffix: '%',
        range: [0, 100],
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
