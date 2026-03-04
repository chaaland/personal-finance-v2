<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { getColors, getChartTemplate } from '$lib/theme';
  import { theme } from '$lib/stores/theme.svelte';

  interface AllocationData {
    label: string;
    value: number;
  }

  interface Props {
    data: AllocationData[];
    title: string;
  }

  let { data, title }: Props = $props();

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

    // Color palette for pie/donut charts - muted, sophisticated tones
    const CHART_COLORS = [
      colors.chart1,
      colors.chart2,
      colors.chart3,
      colors.chart4,
      colors.chart5,
      colors.chart6,
      colors.chart7,
      colors.chart8,
      colors.chart9,
    ];

    if (!hasData) {
      const layout: Partial<Plotly.Layout> = {
        ...template,
        title: title,
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
        height: 380,
      };

      Plotly.newPlot(chartElement, [], layout, { displayModeBar: false });
      return;
    }

    // Sort by value descending
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    const labels = sortedData.map((d) => d.label);
    const values = sortedData.map((d) => d.value);

    const trace: Partial<Plotly.PlotData> = {
      labels: labels,
      values: values,
      type: 'pie',
      hole: 0.55,
      marker: { colors: CHART_COLORS.slice(0, labels.length) },
      textinfo: 'label+percent',
      textposition: 'outside',
      textfont: { size: 10, color: colors.textSecondary },
      hovertemplate: '<b>%{label}</b><br>$%{value:,.0f}<br>%{percent}<extra></extra>',
      pull: Array(labels.length).fill(0.02),
    };

    const layout: Partial<Plotly.Layout> = {
      ...template,
      title: title,
      showlegend: false,
      height: 380,
      margin: { t: 60, r: 100, b: 60, l: 100 },
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
    min-height: 380px;
  }
</style>
