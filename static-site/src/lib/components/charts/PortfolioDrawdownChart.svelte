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

  // Stratified Wealth palette - desaturated jewel tones
  // Ordered from warm (cash/liquid) to cool (tax-advantaged growth)
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
        title: 'Portfolio Balance During Retirement',
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
    const withdrawals = data.map((row) => row.withdrawal);
    const totalBalances = data.map((row) => row.totalBalance);

    const traces: Partial<Plotly.PlotData>[] = [];

    // Add stacked areas for each account type (in reverse order so first depleted is on top)
    for (const accountType of [...WITHDRAWAL_ORDER].reverse()) {
      const balances = data.map((row) => row.balances[accountType]);
      const palette = ACCOUNT_PALETTE[accountType];

      traces.push({
        x: ages,
        y: balances,
        mode: 'lines',
        name: accountType,
        stackgroup: 'one',
        line: { width: 1.5, color: palette.line },
        fillcolor: palette.fill,
        hovertemplate: '$%{y:,.0f}',
      } as Partial<Plotly.PlotData>);
    }

    // Add invisible trace for total balance and withdrawal in unified hover
    traces.push({
      x: ages,
      y: totalBalances,
      mode: 'lines',
      name: 'Total',
      line: { width: 0, color: 'rgba(0,0,0,0)' },
      customdata: withdrawals,
      hovertemplate: '<b>Total: $%{y:,.0f}</b><br>Withdrawal: $%{customdata:,.0f}',
      showlegend: false,
    } as Partial<Plotly.PlotData>);

    const layout: Partial<Plotly.Layout> = {
      ...CHART_TEMPLATE,
      title: { text: 'Portfolio Balance During Retirement', y: 0.98, yanchor: 'top' },
      xaxis: {
        ...CHART_TEMPLATE.xaxis,
        title: 'Age',
      },
      yaxis: {
        ...CHART_TEMPLATE.yaxis,
        title: '',
        tickprefix: '$',
      },
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
      hovermode: 'x unified',
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
