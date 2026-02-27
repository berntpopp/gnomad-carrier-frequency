import { defineStore } from "pinia";
import type { DisplayFormat } from "@gnomad-cf/core/calculations";

interface FormatStoreState {
  defaultFormat: DisplayFormat; // persisted to localStorage
  currentFormat: DisplayFormat; // session-only, reset on new gene analysis
}

/**
 * Pinia store for display format preference.
 *
 * - defaultFormat: persisted to localStorage; user's preferred starting format
 * - currentFormat: session-transient; resets to defaultFormat on resetWizard()
 *   and when the user changes gene (gene-change watcher in useWizard.ts)
 */
export const useFormatStore = defineStore("display-format", {
  state: (): FormatStoreState => ({
    defaultFormat: "percent",
    currentFormat: "percent",
  }),

  actions: {
    /** Set the active display format for the current analysis session. */
    setCurrentFormat(format: DisplayFormat) {
      this.currentFormat = format;
    },

    /** Set the persisted default format (shown in settings dialog). */
    setDefaultFormat(format: DisplayFormat) {
      this.defaultFormat = format;
    },

    /**
     * Reset the session format back to the user's persisted default.
     * Called by useWizard.resetWizard() and the gene-change watcher.
     */
    resetToDefault() {
      this.currentFormat = this.defaultFormat;
    },
  },

  persist: {
    key: "carrier-freq-display-format",
    storage: localStorage,
    pick: ["defaultFormat"], // only persist the preference, not the session-transient currentFormat
  },
});

export type { DisplayFormat };
