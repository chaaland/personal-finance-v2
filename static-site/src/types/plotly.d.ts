/**
 * Type declarations for plotly.js-dist-min
 * This is a minimal bundle of Plotly.js with the same API
 */
declare module 'plotly.js-dist-min' {
  namespace Plotly {
    interface Layout {
      paper_bgcolor?: string;
      plot_bgcolor?: string;
      font?: {
        family?: string;
        color?: string;
        size?: number;
      };
      title?:
        | string
        | {
            text?: string;
            font?: {
              family?: string;
              size?: number;
              color?: string;
            };
            x?: number;
            xanchor?: 'auto' | 'left' | 'center' | 'right';
          };
      xaxis?: Partial<LayoutAxis>;
      yaxis?: Partial<LayoutAxis>;
      legend?: Partial<Legend>;
      margin?: Partial<Margin>;
      hoverlabel?: {
        bgcolor?: string;
        font?: {
          color?: string;
          family?: string;
        };
        bordercolor?: string;
      };
      height?: number;
      width?: number;
      showlegend?: boolean;
      annotations?: Array<Partial<Annotation>>;
    }

    interface LayoutAxis {
      title?: string;
      gridcolor?: string;
      linecolor?: string;
      tickfont?: { size?: number; color?: string };
      showgrid?: boolean;
      gridwidth?: number;
      zeroline?: boolean;
      categoryorder?: 'trace' | 'category ascending' | 'category descending' | 'array' | 'total ascending' | 'total descending';
      categoryarray?: string[];
    }

    interface Legend {
      bgcolor?: string;
      font?: { color?: string; size?: number };
      orientation?: 'v' | 'h';
      yanchor?: 'auto' | 'top' | 'middle' | 'bottom';
      y?: number;
      xanchor?: 'auto' | 'left' | 'center' | 'right';
      x?: number;
    }

    interface Margin {
      t?: number;
      r?: number;
      b?: number;
      l?: number;
      pad?: number;
    }

    interface Annotation {
      text?: string;
      xref?: 'paper' | 'x';
      yref?: 'paper' | 'y';
      x?: number;
      y?: number;
      showarrow?: boolean;
      font?: { size?: number; color?: string };
    }

    interface PlotData {
      type?: 'bar' | 'scatter' | 'line' | 'pie' | 'heatmap' | string;
      x?: (number | string | Date)[];
      y?: (number | string)[];
      orientation?: 'v' | 'h';
      marker?: {
        color?: string | string[];
        line?: {
          color?: string;
          width?: number;
        };
      };
      text?: string | string[];
      textposition?: 'inside' | 'outside' | 'auto' | 'none';
      textfont?: { size?: number; color?: string };
      hovertext?: string | string[];
      hoverinfo?: 'all' | 'none' | 'skip' | 'text' | 'name' | string;
      name?: string;
      mode?: 'lines' | 'markers' | 'lines+markers' | 'text' | string;
    }

    interface Config {
      displayModeBar?: boolean;
      responsive?: boolean;
      staticPlot?: boolean;
    }

    function newPlot(
      graphDiv: HTMLElement | string,
      data: Array<Partial<PlotData>>,
      layout?: Partial<Layout>,
      config?: Partial<Config>
    ): Promise<void>;

    function react(
      graphDiv: HTMLElement | string,
      data: Array<Partial<PlotData>>,
      layout?: Partial<Layout>,
      config?: Partial<Config>
    ): Promise<void>;

    function purge(graphDiv: HTMLElement | string): void;
  }

  export = Plotly;
  export as namespace Plotly;
}
