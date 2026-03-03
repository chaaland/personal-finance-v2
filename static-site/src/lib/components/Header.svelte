<script lang="ts">
  import FileUpload from './FileUpload.svelte';
  import { theme } from '$lib/stores/theme.svelte';

  interface Props {
    onFileUpload: (file: File) => void;
    disabled?: boolean;
  }

  let { onFileUpload, disabled = false }: Props = $props();

  function toggleTheme() {
    theme.toggle();
  }
</script>

<header class="header">
  <h1 class="title">Personal Finance</h1>
  <div class="header-actions">
    <button
      class="theme-toggle"
      class:is-light={!theme.isDark}
      onclick={toggleTheme}
      aria-label={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span class="toggle-icons">
        <!-- Moon icon -->
        <svg
          class="icon icon-moon"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <!-- Sun icon -->
        <svg
          class="icon icon-sun"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <!-- Sliding track indicator -->
        <span class="track-pill"></span>
      </span>
    </button>
    <FileUpload onFileSelect={onFileUpload} {disabled} />
  </div>
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 48px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--color-border);
  }

  .title {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 500;
    color: var(--color-text-primary);
    margin: 0;
    letter-spacing: -0.01em;
    /* Subtle gold gradient on title */
    background-image: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-accent-light) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Toggle: a compact horizontal track with two icons and a sliding pill */
  .theme-toggle {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    outline: none;
  }

  .toggle-icons {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0;
    width: 52px;
    height: 28px;
    border: 1px solid var(--color-border-strong);
    border-radius: 6px;
    padding: 0 6px;
    justify-content: space-between;
    background: var(--color-card);
    transition:
      border-color 0.2s ease,
      background 0.2s ease;
    overflow: hidden;
  }

  .theme-toggle:hover .toggle-icons {
    border-color: var(--color-accent);
  }

  .icon {
    position: relative;
    z-index: 2;
    color: var(--color-text-muted);
    flex-shrink: 0;
    transition: color 0.2s ease;
  }

  /* Sliding pill behind the icons */
  .track-pill {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background: var(--color-accent-glow);
    border: 1px solid var(--color-accent);
    transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 1;
  }

  /* Dark mode: pill on the left (moon side) */
  .theme-toggle:not(.is-light) .track-pill {
    transform: translateX(0);
  }

  /* Light mode: pill on the right (sun side) */
  .theme-toggle.is-light .track-pill {
    transform: translateX(24px);
  }

  /* Active icon is accented, inactive is muted */
  .theme-toggle:not(.is-light) .icon-moon {
    color: var(--color-accent);
  }

  .theme-toggle.is-light .icon-sun {
    color: var(--color-accent);
  }
</style>
