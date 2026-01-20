import { defineStore } from 'pinia';
import type { HistoryEntry, HistoryStoreState } from '@/types';

export const useHistoryStore = defineStore('history', {
  state: (): HistoryStoreState => ({
    entries: [],
    settings: {
      maxEntries: 50, // Default from CONTEXT.md
    },
  }),

  getters: {
    /**
     * Get entry count
     */
    entryCount: (state): number => state.entries.length,

    /**
     * Check if history is empty
     */
    isEmpty: (state): boolean => state.entries.length === 0,

    /**
     * Get most recent entry (for duplicate detection)
     */
    mostRecent: (state): HistoryEntry | null =>
      state.entries.length > 0 ? state.entries[0] : null,

    /**
     * Group entries by calendar date for timeline display
     */
    groupedByDate: (state): Array<{ date: string; entries: HistoryEntry[] }> => {
      const groups = new Map<string, HistoryEntry[]>();

      for (const entry of state.entries) {
        const dateKey = new Date(entry.timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        if (!groups.has(dateKey)) {
          groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(entry);
      }

      return Array.from(groups.entries()).map(([date, entries]) => ({
        date,
        entries,
      }));
    },
  },

  actions: {
    /**
     * Add a new history entry with ring buffer management.
     * Entry is prepended (newest first).
     */
    addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
      const newEntry: HistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      this.entries.unshift(newEntry);

      // Ring buffer: remove oldest when exceeding max
      while (this.entries.length > this.settings.maxEntries) {
        this.entries.pop();
      }
    },

    /**
     * Delete a single entry by ID
     */
    deleteEntry(id: string) {
      const index = this.entries.findIndex(e => e.id === id);
      if (index > -1) {
        this.entries.splice(index, 1);
      }
    },

    /**
     * Clear all history entries
     */
    clearAll() {
      this.entries = [];
    },

    /**
     * Update max entries setting and enforce immediately
     */
    setMaxEntries(max: number) {
      // Clamp to reasonable range (10-200)
      this.settings.maxEntries = Math.max(10, Math.min(200, max));

      // Enforce new limit immediately
      while (this.entries.length > this.settings.maxEntries) {
        this.entries.pop();
      }
    },

    /**
     * Find entry by ID
     */
    getEntry(id: string): HistoryEntry | undefined {
      return this.entries.find(e => e.id === id);
    },
  },

  persist: {
    key: 'carrier-freq-history',
    storage: localStorage,
  },
});
