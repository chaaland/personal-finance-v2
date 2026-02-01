<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { COLORS, CHART_TEMPLATE } from '$lib/theme';
  import type { IncomeByYear } from '$lib/data/types';

  interface Props {
    data: IncomeByYear[];
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
        title: 'Annual Income',
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
    const grossValues = data.map((row) => row.grossUsd);
    const netValues = data.map((row) => row.netUsd);

    const maxValue = Math.max(...grossValues);

    // Gross income bars
    const grossTrace: Partial<Plotly.PlotData> = {
      x: years,
      y: grossValues,
      type: 'bar',
      name: 'Gross',
      marker: { color: COLORS.chart1 },
      text: grossValues.map((v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`),
      textposition: 'outside',
      textfont: { size: 14, color: COLORS.textSecondary },
      hovertemplate: '%{x}<br>Gross: $%{y:,.0f}<extra></extra>',
    };

    // Net income bars
    const netTrace: Partial<Plotly.PlotData> = {
      x: years,
      y: netValues,
      type: 'bar',
      name: 'Net',
      marker: { color: COLORS.chart2 },
      text: netValues.map((v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`),
      textposition: 'outside',
      textfont: { size: 14, color: COLORS.textSecondary },
      hovertemplate: '%{x}<br>Net: $%{y:,.0f}<extra></extra>',
    };

    const layout: Partial<Plotly.Layout> = {
      ...CHART_TEMPLATE,
      title: 'Annual Income',
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
      barmode: 'group',
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.02,
        xanchor: 'left',
        x: 0,
        font: { size: 13, color: COLORS.textSecondary },
        bgcolor: 'rgba(0,0,0,0)',
      },
      margin: { t: 80, r: 24, b: 48, l: 60 },
      height: 400,
      showlegend: true,
    };

    Plotly.newPlot(chartElement, [grossTrace, netTrace], layout, { displayModeBar: false });
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
