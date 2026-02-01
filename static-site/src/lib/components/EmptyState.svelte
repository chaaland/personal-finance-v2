<script lang="ts">
  // No props needed for this component
</script>

<div class="empty-state">
  <div class="diamond">&#9671;</div>
  <h2 class="heading">No Data Loaded</h2>
  <p class="description">Upload an Excel file to view your financial dashboard.</p>
</div>

<style>
  .empty-state {
    text-align: center;
    padding: 120px 48px;
    background-color: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }

  .diamond {
    font-size: 48px;
    color: var(--color-accent);
    margin-bottom: 24px;
    font-weight: 300;
  }

  .heading {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 12px 0;
    letter-spacing: -0.02em;
  }

  .description {
    color: var(--color-text-secondary);
    font-size: 15px;
    max-width: 320px;
    margin: 0 auto;
    line-height: 1.6;
  }
</style>
