<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { COLORS, CHART_TEMPLATE } from '$lib/theme';

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

  // Color palette for pie/donut charts - muted, sophisticated tones
  const CHART_COLORS = [
    COLORS.chart1, // Burnished gold
    COLORS.chart2, // Slate blue
    COLORS.chart3, // Sage green
    COLORS.chart4, // Terracotta
    COLORS.chart5, // Muted lavender
    COLORS.chart6, // Terracotta
    COLORS.chart7, // Muted teal
    COLORS.chart8, // Cool slate
    COLORS.chart9, // Muted ochre
  ];

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
        title: title,
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
        height: 300,
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
      textfont: { size: 10, color: COLORS.textSecondary },
      hovertemplate: '<b>%{label}</b><br>$%{value:,.0f}<br>%{percent}<extra></extra>',
      pull: Array(labels.length).fill(0.02),
    };

    const layout: Partial<Plotly.Layout> = {
      ...CHART_TEMPLATE,
      title: title,
      showlegend: false,
      height: 300,
      margin: { t: 60, r: 60, b: 40, l: 60 },
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
    min-height: 300px;
  }
</style>
