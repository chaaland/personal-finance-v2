<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeDatabase } from '$lib/data/database';
  import { loadExcelFile } from '$lib/data/loader';
  import { Header, TabBar, EmptyState } from '$lib/components';
  import { SummaryTab, NetWorthTab, IncomeTab } from '$lib/components/tabs';

  let hasData = $state(false);
  let activeTab = $state('summary');
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      await initializeDatabase();
      console.log('DuckDB initialized successfully');
    } catch (err) {
      console.error('Failed to initialize DuckDB:', err);
      error = err instanceof Error ? err.message : 'Failed to initialize database';
    }
  });

  async function handleFileUpload(file: File) {
    isLoading = true;
    error = null;
    try {
      const result = await loadExcelFile(file);
      if (result.success) {
        hasData = true;
        console.log('Excel file loaded successfully');
      } else {
        error = result.error || 'Failed to load file';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load file';
    } finally {
      isLoading = false;
    }
  }

  function handleTabChange(tab: string) {
    activeTab = tab;
  }
</script>

<div class="app">
  <Header onFileUpload={handleFileUpload} />

  {#if isLoading}
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Loading data...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>{error}</p>
    </div>
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

  .error {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    color: var(--color-negative);
    font-size: 16px;
    text-align: center;
    padding: 48px;
    background-color: var(--color-negative-bg);
    border: 1px solid var(--color-negative);
    border-radius: 3px;
  }

  .error p {
    margin: 0;
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
