<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Resolves to the data the content needs. */
    promise: Promise<T>;
    loadingText: string;
    /** Rendered once the promise resolves, with its value. */
    children: Snippet<[T]>;
  }

  let { promise, loadingText, children }: Props = $props();

  $effect(() => {
    promise.catch((err) => console.error('Error loading data:', err));
  });
</script>

{#await promise}
  <div class="status loading">{loadingText}</div>
{:then value}
  {@render children(value)}
{:catch err}
  <div class="status error">
    <p>Error loading data: {err instanceof Error ? err.message : 'Failed to load data'}</p>
  </div>
{/await}

<style>
  .status {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    font-size: 16px;
  }

  .loading {
    color: var(--color-text-secondary);
  }

  .error {
    color: var(--color-negative);
  }
</style>
