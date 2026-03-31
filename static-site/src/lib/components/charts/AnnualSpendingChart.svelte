<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { getColors, getChartTemplate } from '$lib/theme';
  import { theme } from '$lib/stores/theme.svelte';
  import type { SpendingByYear } from '$lib/data/types';

  interface Props {
    data: SpendingByYear[];
    projectedSpend?: number;
  }

  let { data, projectedSpend }: Props = $props();

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
        title: 'Annual Spending',
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

    const maxYear = Math.max(...data.map((r) => r.year));
    const currentYearActual = data.find((r) => r.year === maxYear);
    const projectedValue = projectedSpend ?? currentYearActual?.totalUsd ?? 0;

    const maxValue = Math.max(...data.map((r) => r.totalUsd), projectedValue);

    // Projected bar drawn first so it sits behind the actual bar
    const projectedTrace: Partial<Plotly.PlotData> = {
      x: [maxYear],
      y: [projectedValue],
      type: 'bar',
      name: 'Projected',
      showlegend: true,
      opacity: 0.35,
      marker: { color: colors.chart1 },
      text: [`$${projectedValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} est.`],
      textposition: 'outside',
      textfont: { size: 14, color: colors.textSecondary },
      hovertemplate: `${maxYear} (Projected)<br>$%{y:,.0f}<extra></extra>`,
    };

    // Actual bars drawn on top — omit label for current year (projected label covers it)
    const actualTrace: Partial<Plotly.PlotData> = {
      x: data.map((r) => r.year),
      y: data.map((r) => r.totalUsd),
      type: 'bar',
      name: 'Actual',
      showlegend: false,
      marker: { color: colors.chart1 },
      text: data.map((r) =>
        r.year < maxYear
          ? `$${r.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          : ''
      ),
      textposition: 'outside',
      textfont: { size: 14, color: colors.textSecondary },
      hovertemplate: '%{x}<br>$%{y:,.0f}<extra></extra>',
    };

    const layout: Partial<Plotly.Layout> = {
      ...template,
      title: 'Annual Spending',
      barmode: 'overlay',
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
        range: [0, maxValue * 1.2],
      },
      margin: { t: 60, r: 24, b: 48, l: 60 },
      height: 400,
      showlegend: true,
    };

    Plotly.newPlot(chartElement, [projectedTrace, actualTrace], layout, {
      displayModeBar: false,
    });
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
