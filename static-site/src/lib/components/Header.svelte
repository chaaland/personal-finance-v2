<script lang="ts">
  import FileUpload from './FileUpload.svelte';

  interface Props {
    onFileUpload: (file: File) => void;
  }

  let { onFileUpload }: Props = $props();
</script>

<header class="header">
  <h1 class="title">Personal Finance</h1>
  <FileUpload onFileSelect={onFileUpload} />
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
</style>
