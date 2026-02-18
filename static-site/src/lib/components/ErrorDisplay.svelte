<script lang="ts">
  import type { LoadError } from '$lib/data/loader';

  interface Props {
    errors: LoadError[];
    warnings: LoadError[];
    onRetry: () => void;
  }

  let { errors, warnings, onRetry }: Props = $props();

  function formatError(error: LoadError): string {
    let msg = `${error.sheet}`;
    if (error.row) {
      msg += ` (row ${error.row}`;
      if (error.column) {
        msg += `, column "${error.column}"`;
      }
      msg += ')';
    }
    msg += `: ${error.message}`;
    return msg;
  }
</script>

<div class="error-display">
  {#if errors.length > 0}
    <div class="error-section">
      <h3 class="error-title">Unable to load file</h3>
      <p class="error-subtitle">The following errors need to be fixed:</p>
      <ul class="error-list">
        {#each errors as error}
          <li class="error-item">{formatError(error)}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if warnings.length > 0}
    <div class="warning-section">
      <h4 class="warning-title">Warnings</h4>
      <ul class="warning-list">
        {#each warnings as warning}
          <li class="warning-item">{formatError(warning)}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="actions">
    <button class="retry-button" onclick={onRetry}>
      Try Again
    </button>
  </div>
</div>

<style>
  .error-display {
    max-width: 600px;
    margin: 48px auto;
    padding: 32px;
    background-color: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 8px;
  }

  .error-section {
    margin-bottom: 24px;
  }

  .error-title {
    margin: 0 0 8px 0;
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    color: var(--color-negative);
  }

  .error-subtitle {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: var(--color-text-secondary);
  }

  .error-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .error-item {
    padding: 12px 16px;
    margin-bottom: 8px;
    background-color: var(--color-negative-bg);
    border-left: 3px solid var(--color-negative);
    border-radius: 0 4px 4px 0;
    font-size: 13px;
    color: var(--color-text-primary);
    font-family: var(--font-body);
  }

  .warning-section {
    margin-bottom: 24px;
  }

  .warning-title {
    margin: 0 0 12px 0;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--color-accent);
  }

  .warning-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .warning-item {
    padding: 10px 14px;
    margin-bottom: 6px;
    background-color: var(--color-accent-glow);
    border-left: 3px solid var(--color-accent);
    border-radius: 0 4px 4px 0;
    font-size: 13px;
    color: var(--color-text-secondary);
    font-family: var(--font-body);
  }

  .actions {
    display: flex;
    justify-content: center;
    margin-top: 24px;
  }

  .retry-button {
    padding: 12px 32px;
    background-color: var(--color-accent);
    border: none;
    border-radius: 4px;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    color: var(--color-background);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .retry-button:hover {
    background-color: var(--color-accent-light);
  }
</style>
