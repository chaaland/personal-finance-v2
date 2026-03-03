<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeDatabase } from '$lib/data/database';
  import { loadExcelFile, type LoadError, type LoadProgress } from '$lib/data/loader';
  import { Header, TabBar, EmptyState, ErrorDisplay } from '$lib/components';
  import { SummaryTab, NetWorthTab, IncomeTab, SpendingTab, FIRETab } from '$lib/components/tabs';
  import { theme } from '$lib/stores/theme.svelte';

  $effect(() => {
    document.documentElement.setAttribute('data-theme', theme.isDark ? 'dark' : 'light');
  });

  type LoadingPhase = 'idle' | 'initializing' | 'processing' | 'ready' | 'error';

  let hasData = $state(false);
  let activeTab = $state('summary');
  let loadingPhase = $state<LoadingPhase>('initializing');
  let loadingMessage = $state('Initializing database...');
  let errors = $state<LoadError[]>([]);
  let warnings = $state<LoadError[]>([]);
  let fileInputRef = $state<HTMLInputElement | null>(null);

  onMount(async () => {
    try {
      await initializeDatabase();
      console.log('DuckDB initialized successfully');
      loadingPhase = 'idle';
    } catch (err) {
      console.error('Failed to initialize DuckDB:', err);
      errors = [{
        sheet: 'System',
        message: err instanceof Error ? err.message : 'Failed to initialize database',
      }];
      loadingPhase = 'error';
    }
  });

  function handleProgress(progress: LoadProgress) {
    loadingMessage = progress.message;
  }

  async function handleFileUpload(file: File) {
    loadingPhase = 'processing';
    loadingMessage = 'Reading Excel file...';
    errors = [];
    warnings = [];

    try {
      const result = await loadExcelFile(file, handleProgress);
      if (result.success) {
        hasData = true;
        warnings = result.warnings;
        loadingPhase = 'ready';
        console.log('Excel file loaded successfully');
        if (result.warnings.length > 0) {
          console.warn('Loaded with warnings:', result.warnings);
        }
      } else {
        errors = result.errors;
        warnings = result.warnings;
        loadingPhase = 'error';
      }
    } catch (err) {
      errors = [{
        sheet: 'System',
        message: err instanceof Error ? err.message : 'Failed to load file',
      }];
      loadingPhase = 'error';
    }
  }

  function handleRetry() {
    errors = [];
    warnings = [];
    loadingPhase = 'idle';
    hasData = false;
  }

  function handleTabChange(tab: string) {
    activeTab = tab;
  }
</script>

<div class="app">
  <Header onFileUpload={handleFileUpload} disabled={loadingPhase === 'initializing' || loadingPhase === 'processing'} />

  {#if loadingPhase === 'initializing' || loadingPhase === 'processing'}
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>{loadingMessage}</p>
    </div>
  {:else if loadingPhase === 'error'}
    <ErrorDisplay {errors} {warnings} onRetry={handleRetry} />
  {:else if !hasData}
    <EmptyState />
  {:else}
    <TabBar {activeTab} onTabChange={handleTabChange} />
    <main class="content">
      {#if activeTab === 'summary'}
        <SummaryTab />
      {:else if activeTab === 'networth'}
        <NetWorthTab />
      {:else if activeTab === 'income'}
        <IncomeTab />
      {:else if activeTab === 'spending'}
        <SpendingTab />
      {:else if activeTab === 'fire'}
        <FIRETab />
      {:else}
        <div class="placeholder">
          <p>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tab coming soon...</p>
        </div>
      {/if}
    </main>
  {/if}
</div>

<style>
  .app {
    min-height: 100vh;
    padding: 40px 48px;
    background-color: var(--color-background);
  }

  .content {
    padding-top: 0;
  }

  .loading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    color: var(--color-text-secondary);
    font-size: 16px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .placeholder {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    color: var(--color-text-muted);
    font-size: 18px;
    font-style: italic;
  }

  .placeholder p {
    margin: 0;
  }
</style>
