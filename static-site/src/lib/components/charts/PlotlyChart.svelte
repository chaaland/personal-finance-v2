<script lang="ts" module>
  import Plotly from 'plotly.js-dist-min';
  import type { ChartColors, ChartTemplate } from '$lib/theme';

  /** Theme-aware inputs handed to a chart's `build` function. */
  export interface ChartContext {
    colors: ChartColors;
    template: ChartTemplate;
  }

  /**
   * What a chart contributes: its traces, plus layout overrides. Overrides are
   * layered on the theme template; `xaxis`, `yaxis` and `legend` are merged
   * into the template's rather than replacing it.
   */
  export type Trace = Plotly.Data;

  export interface ChartSpec {
    traces: Trace[];
    layout?: Partial<Plotly.Layout>;
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getColors, getChartTemplate } from '$lib/theme';
  import { theme } from '$lib/stores/theme.svelte';

  interface Props {
    title: string;
    /** Builds the chart from the current theme. Only called when `empty` is false. */
    build: (ctx: ChartContext) => ChartSpec;
    /** Show `emptyMessage` instead of a chart. */
    empty?: boolean;
    emptyMessage?: string;
    height?: number;
  }

  let { title, build, empty = false, emptyMessage = 'No data available', height = 400 }: Props =
    $props();

  let chartElement: HTMLDivElement;

  const config = { displayModeBar: false };

  onDestroy(() => {
    if (chartElement) {
      Plotly.purge(chartElement);
    }
  });

  // Re-renders when the theme changes or anything `build` reads changes.
  $effect(() => {
    if (!chartElement) return;
    const colors = getColors(theme.isDark);
    const template = getChartTemplate(theme.isDark);

    if (empty) {
      Plotly.newPlot(
        chartElement,
        [],
        {
          ...template,
          title: { text: title },
          height,
          annotations: [
            {
              text: emptyMessage,
              xref: 'paper',
              yref: 'paper',
              x: 0.5,
              y: 0.5,
              showarrow: false,
              font: { size: 14, color: colors.textSecondary },
            },
          ],
        },
        config
      );
      return;
    }

    const { traces, layout = {} } = build({ colors, template });
    Plotly.newPlot(
      chartElement,
      traces,
      {
        ...template,
        title: { text: title },
        height,
        ...layout,
        xaxis: { ...template.xaxis, title: { text: '' }, ...layout.xaxis },
        yaxis: { ...template.yaxis, title: { text: '' }, ...layout.yaxis },
        legend: {
          ...template.legend,
          ...layout.legend,
          font: { ...template.legend.font, ...layout.legend?.font },
        },
      },
      config
    );
  });
</script>

<div class="chart-container" style:min-height="{height}px" bind:this={chartElement}></div>

<style>
  .chart-container {
    width: 100%;
  }
</style>
