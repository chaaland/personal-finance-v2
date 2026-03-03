import { writable } from 'svelte/store';

const stored = typeof window !== 'undefined' ? localStorage.getItem('pf-theme') : null;

export const isDarkMode = writable<boolean>(stored !== 'light');

isDarkMode.subscribe((dark) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pf-theme', dark ? 'dark' : 'light');
  }
});
