/**
 * Svelte 5 rune-based theme store.
 * Uses native $state for first-class $effect tracking.
 */

class ThemeState {
  isDark = $state<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('pf-theme') !== 'light' : true
  );

  toggle() {
    this.isDark = !this.isDark;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pf-theme', this.isDark ? 'dark' : 'light');
    }
  }
}

export const theme = new ThemeState();
