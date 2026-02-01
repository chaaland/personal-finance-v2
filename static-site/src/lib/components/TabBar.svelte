<script lang="ts">
  interface Props {
    activeTab: string;
    onTabChange: (tab: string) => void;
  }

  let { activeTab, onTabChange }: Props = $props();

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'networth', label: 'Net Worth' },
    { id: 'income', label: 'Income' },
    { id: 'spending', label: 'Spending' },
    { id: 'fire', label: 'FIRE' },
  ] as const;

  function handleTabClick(tabId: string) {
    onTabChange(tabId);
  }
</script>

<nav class="tab-bar">
  {#each tabs as tab}
    <button
      type="button"
      class="tab"
      class:active={activeTab === tab.id}
      onclick={() => handleTabClick(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</nav>

<style>
  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 32px;
  }

  .tab {
    background-color: transparent;
    color: var(--color-text-muted);
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 16px 24px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .tab:hover {
    color: var(--color-text-secondary);
  }

  .tab.active {
    color: var(--color-accent);
    border-bottom: 2px solid var(--color-accent);
    font-weight: 600;
    text-shadow: 0 0 20px var(--color-accent-glow);
  }
</style>
