/**
 * Svelte stores for app state management.
 */

import { writable } from 'svelte/store';

/**
 * Whether data has been loaded into the database.
 */
export const dataLoaded = writable<boolean>(false);

/**
 * Whether the app is currently loading data.
 */
export const isLoading = writable<boolean>(false);

/**
 * Error message if data loading failed.
 */
export const loadError = writable<string | null>(null);

/**
 * Currently active tab.
 */
export type TabId = 'summary' | 'networth' | 'income' | 'spending' | 'fire';
export const activeTab = writable<TabId>('summary');
