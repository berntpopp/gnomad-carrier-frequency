import { defineStore } from 'pinia';
import type { LogLevel, LogEntry, LogSettings, LogStats } from '@/types';

interface LogStoreState {
  entries: LogEntry[];
  nextId: number;
  droppedCount: number;
  settings: LogSettings;
}

export const useLogStore = defineStore('logs', {
  state: (): LogStoreState => ({
    entries: [],
    nextId: 1,
    droppedCount: 0,
    settings: {
      maxEntries: 500,
      autoClearOnStart: false,
      defaultFilterLevel: 'INFO',
      enabledCategories: ['api', 'calculation', 'error', 'user'],
    },
  }),

  getters: {
    /**
     * Compute statistics about the log store
     */
    stats: (state): LogStats => {
      const bytes = JSON.stringify(state.entries).length;
      const memoryEstimate =
        bytes < 1024
          ? `${bytes} B`
          : bytes < 1024 * 1024
            ? `${(bytes / 1024).toFixed(1)} KB`
            : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

      const byLevel: Record<LogLevel, number> = {
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0,
      };
      state.entries.forEach((e) => byLevel[e.level]++);

      return {
        totalCount: state.entries.length,
        droppedCount: state.droppedCount,
        memoryEstimate,
        byLevel,
      };
    },
  },

  actions: {
    /**
     * Add a log entry with ring buffer management
     */
    log(level: LogLevel, category: string, message: string, details?: unknown) {
      const entry: LogEntry = {
        id: this.nextId++,
        timestamp: Date.now(),
        level,
        category,
        message,
        details,
      };

      this.entries.push(entry);

      // Ring buffer: remove oldest when exceeding max
      while (this.entries.length > this.settings.maxEntries) {
        this.entries.shift();
        this.droppedCount++;
      }
    },

    /**
     * Clear all entries but preserve droppedCount for statistics
     */
    clear() {
      this.entries = [];
      // Note: droppedCount preserved for statistics
    },

    /**
     * Clear everything and reset to initial state
     */
    clearAll() {
      this.entries = [];
      this.droppedCount = 0;
      this.nextId = 1;
    },

    /**
     * Update settings with partial configuration
     */
    updateSettings(settings: Partial<LogSettings>) {
      Object.assign(this.settings, settings);
      // Enforce new max immediately
      while (this.entries.length > this.settings.maxEntries) {
        this.entries.shift();
        this.droppedCount++;
      }
    },
  },

  persist: {
    key: 'carrier-freq-logs',
    storage: localStorage,
  },
});
