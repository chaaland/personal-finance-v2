<script lang="ts">
  interface Props {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
  }

  let { onFileSelect, disabled = false }: Props = $props();

  let fileInput: HTMLInputElement;

  function handleClick() {
    if (!disabled) {
      fileInput.click();
    }
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      onFileSelect(file);
      // Reset input so same file can be selected again
      target.value = '';
    }
  }
</script>

<input
  type="file"
  accept=".xlsx"
  bind:this={fileInput}
  onchange={handleFileChange}
  class="hidden-input"
/>
<button type="button" class="upload-button" class:disabled onclick={handleClick} {disabled}>
  <span>Upload Data</span>
  <span class="arrow">&#8593;</span>
</button>

<style>
  .hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .upload-button {
    padding: 12px 24px;
    background-color: transparent;
    border: 1px solid var(--color-accent);
    border-radius: 3px;
    cursor: pointer;
    color: var(--color-accent);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.02em;
    transition: all 0.25s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .upload-button:hover {
    background-color: var(--color-accent-glow);
  }

  .arrow {
    font-size: 14px;
  }

  .upload-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .upload-button.disabled:hover {
    background-color: transparent;
  }
</style>
