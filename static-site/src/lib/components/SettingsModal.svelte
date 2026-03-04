<script lang="ts">
  import { settings, FIRE_GOAL_MIN, FIRE_GOAL_MAX } from '$lib/stores/settings.svelte';
  import { formatCurrency } from '$lib/theme';

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  const atMin = $derived(settings.fireGoal.lte(FIRE_GOAL_MIN));
  const atMax = $derived(settings.fireGoal.gte(FIRE_GOAL_MAX));
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="backdrop" role="presentation" onclick={onclose}>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Settings" tabindex="-1" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2 class="modal-title">Settings</h2>
        <button class="close-btn" onclick={onclose} aria-label="Close settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="divider"></div>

      <div class="setting-row">
        <p class="setting-label">FIRE Target</p>
        <div class="stepper">
          <button
            class="stepper-btn"
            onclick={() => settings.decrement()}
            disabled={atMin}
            aria-label="Decrease FIRE target by $250,000"
          >−</button>
          <span class="stepper-value">{formatCurrency(settings.fireGoal)}</span>
          <button
            class="stepper-btn"
            onclick={() => settings.increment()}
            disabled={atMax}
            aria-label="Increase FIRE target by $250,000"
          >+</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    background: var(--color-card);
    border: 1px solid var(--color-border-strong);
    border-radius: 12px;
    padding: 24px;
    min-width: 320px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .modal-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 500;
    color: var(--color-text-primary);
    margin: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--color-border-strong);
    border-radius: 6px;
    background: var(--color-card);
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0;
    transition: border-color 0.2s ease, color 0.2s ease;
  }

  .close-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-text-primary);
  }

  .divider {
    height: 1px;
    background: var(--color-border);
    margin-bottom: 20px;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .setting-label {
    font-size: 13px;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .stepper-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--color-border-strong);
    border-radius: 6px;
    background: var(--color-card);
    color: var(--color-text-primary);
    font-size: 16px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  .stepper-btn:hover:not(:disabled) {
    border-color: var(--color-accent);
    background: var(--color-accent-glow);
  }

  .stepper-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .stepper-value {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 500;
    color: var(--color-text-primary);
    min-width: 140px;
    text-align: center;
  }
</style>
