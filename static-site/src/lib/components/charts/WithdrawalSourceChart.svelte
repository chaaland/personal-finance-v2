<script lang="ts">
  import { onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import { COLORS, CHART_TEMPLATE } from '$lib/theme';
  import type { RetirementDrawdownRow, AccountType } from '$lib/data/types';
  import { WITHDRAWAL_ORDER } from '$lib/transforms/fire';

  interface Props {
    data: RetirementDrawdownRow[];
  }

  let { data }: Props = $props();

  let chartElement: HTMLDivElement;

  onDestroy(() => {
    if (chartElement) {
      Plotly.purge(chartElement);
    }
  });

  // Stratified Wealth palette - matching PortfolioDrawdownChart
  const ACCOUNT_PALETTE: Record<AccountType, { fill: string; line: string }> = {
    'UK Cash': { fill: 'rgba(196, 167, 125, 0.55)', line: 'rgba(196, 167, 125, 0.85)' },
    'HYSA': { fill: 'rgba(251, 191, 114, 0.55)', line: 'rgba(251, 191, 114, 0.85)' },
    'Coinbase': { fill: 'rgba(245, 158, 89, 0.55)', line: 'rgba(245, 158, 89, 0.85)' },
    'Taxable Brokerage': { fill: 'rgba(134, 182, 159, 0.55)', line: 'rgba(134, 182, 159, 0.85)' },
    'UK Pension': { fill: 'rgba(124, 165, 184, 0.55)', line: 'rgba(124, 165, 184, 0.85)' },
    '401k': { fill: 'rgba(116, 165, 193, 0.55)', line: 'rgba(116, 165, 193, 0.85)' },
    'IRA': { fill: 'rgba(147, 141, 194, 0.55)', line: 'rgba(147, 141, 194, 0.85)' },
    'HSA': { fill: 'rgba(99, 179, 171, 0.55)', line: 'rgba(99, 179, 171, 0.85)' },
    'Roth IRA': { fill: 'rgba(176, 147, 182, 0.55)', line: 'rgba(176, 147, 182, 0.85)' },
  };

  const hasData = $derived(data.length > 0);

  function renderChart() {
    if (!chartElement) return;

    if (!hasData) {
      const layout: Partial<Plotly.Layout> = {
        ...CHART_TEMPLATE,
        title: 'Annual Retirement Income by Source',
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
        height: 450,
      };

      Plotly.newPlot(chartElement, [], layout, { displayModeBar: false });
      return;
    }

    const ages = data.map((row) => row.age);
    const traces: Partial<Plotly.PlotData>[] = [];

    // Add stacked bars for each account type
    for (const accountType of WITHDRAWAL_ORDER) {
      const withdrawals = data.map((row) => row.withdrawalsByAccount[accountType]);
      const palette = ACCOUNT_PALETTE[accountType];

      traces.push({
        x: ages,
        y: withdrawals,
        type: 'bar',
        name: accountType,
        marker: {
          color: palette.fill,
          line: { width: 1, color: palette.line },
        },
        hovertemplate: `${accountType}: $%{y:,.0f}<extra></extra>`,
      } as Partial<Plotly.PlotData>);
    }

    const layout: Partial<Plotly.Layout> = {
      ...CHART_TEMPLATE,
      title: { text: 'Annual Retirement Income by Source', y: 0.98, yanchor: 'top' },
      xaxis: {
        ...CHART_TEMPLATE.xaxis,
        title: 'Age',
      },
      yaxis: {
        ...CHART_TEMPLATE.yaxis,
        title: '',
        tickprefix: '$',
      },
      barmode: 'stack',
      height: 450,
      margin: { t: 80, r: 24, b: 48, l: 70 },
      showlegend: true,
      legend: {
        orientation: 'h',
        yanchor: 'top',
        y: 1.12,
        xanchor: 'left',
        x: 0,
        font: { size: 12, color: COLORS.textSecondary },
      },
    };

    Plotly.newPlot(chartElement, traces, layout, { displayModeBar: false });
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
    min-height: 450px;
  }
</style>
