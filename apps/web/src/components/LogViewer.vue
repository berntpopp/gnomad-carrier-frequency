<template>
  <div class="log-viewer">
    <!-- Header with actions -->
    <div
      class="d-flex align-center justify-space-between pb-3 mb-3 border-bottom"
    >
      <div class="d-flex align-center">
        <div class="modal-icon-badge primary-badge mr-3">
          <v-icon size="20" color="primary">mdi-console</v-icon>
        </div>
        <div>
          <div class="text-subtitle-1 font-weight-bold">Application Logs</div>
          <div class="text-caption text-medium-emphasis">
            Diagnostics and runtime telemetry
          </div>
        </div>
      </div>
      <v-btn
        icon
        variant="text"
        size="small"
        aria-label="Close log viewer"
        class="modal-close-btn"
        @click="emit('close')"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </div>

    <!-- Statistics -->
    <v-card variant="tonal" class="mb-3 pa-3 stats-card" rounded="lg">
      <div
        class="d-flex flex-wrap align-center justify-space-between ga-2 text-body-2 mb-2 font-mono"
      >
        <span>
          <strong>{{ stats.totalCount }}</strong> entries
        </span>
        <span v-if="stats.droppedCount > 0" class="text-warning">
          <strong>{{ stats.droppedCount }}</strong> dropped
        </span>
        <span class="text-medium-emphasis">
          {{ stats.memoryEstimate }}
        </span>
      </div>
      <div class="d-flex flex-wrap ga-2 text-caption">
        <v-chip
          v-for="level in levels"
          :key="level"
          size="small"
          :color="levelColors[level]"
          variant="flat"
          class="font-mono"
        >
          {{ level }}: {{ stats.byLevel[level] }}
        </v-chip>
      </div>
    </v-card>

    <!-- Search and filters -->
    <div class="d-flex flex-column ga-2 mb-3">
      <v-text-field
        v-model="searchQuery"
        prepend-inner-icon="mdi-magnify"
        placeholder="Filter logs by message or category..."
        density="compact"
        variant="outlined"
        hide-details
        clearable
      />

      <div class="d-flex flex-wrap ga-3 align-center py-1">
        <v-checkbox
          v-for="level in levels"
          :key="level"
          v-model="enabledLevels"
          :value="level"
          :label="level"
          :color="levelColors[level]"
          density="compact"
          hide-details
          class="level-checkbox font-mono"
        />
      </div>
    </div>

    <!-- Log entries -->
    <v-list density="compact" class="log-list rounded border pa-1">
      <template v-if="filteredEntries.length > 0">
        <v-list-item
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="log-entry rounded mb-1 px-3 py-2"
          @click="toggleExpanded(entry.id)"
        >
          <template #prepend>
            <v-chip
              size="small"
              :color="levelColors[entry.level]"
              variant="flat"
              class="mr-2 level-chip font-mono"
            >
              {{ entry.level }}
            </v-chip>
          </template>

          <v-list-item-title class="text-body-2 log-item-text">
            <span class="text-medium-emphasis mr-2 font-mono text-caption">
              {{ formatTimestamp(entry.timestamp) }}
            </span>
            <span class="font-weight-medium mr-2 font-mono text-primary"
              >[{{ entry.category }}]</span
            >
            <span>{{ entry.message }}</span>
          </v-list-item-title>

          <!-- Expanded details -->
          <div
            v-if="expandedIds.has(entry.id) && entry.details"
            class="mt-2 pa-3 rounded bg-grey-darken-4 details-box"
          >
            <pre class="text-caption text-wrap font-mono">{{
              formatDetails(entry.details)
            }}</pre>
          </div>
        </v-list-item>
      </template>

      <v-list-item v-else>
        <v-list-item-title class="text-medium-emphasis text-center py-4">
          No logs match current filters
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- Actions -->
    <div class="d-flex flex-wrap ga-3 mt-3 pt-2">
      <v-btn
        variant="outlined"
        min-height="44"
        prepend-icon="mdi-download"
        class="flex-1"
        @click="handleDownload"
      >
        Download JSON
      </v-btn>

      <v-btn
        variant="outlined"
        min-height="44"
        color="warning"
        prepend-icon="mdi-delete"
        class="flex-1"
        @click="handleClear"
      >
        Clear Logs
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useLogStore } from "@/stores/useLogStore";
import { useExport, useConfirmDialog } from "@/composables";
import type { LogLevel, LogEntry } from "@gnomad-cf/core/types";

const emit = defineEmits<{
  close: [];
}>();

const logStore = useLogStore();
const { exportLogsToJson } = useExport();
const { ask } = useConfirmDialog();

// Filter state
const searchQuery = ref("");
const levels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];
const enabledLevels = ref<LogLevel[]>(["INFO", "WARN", "ERROR"]);
const expandedIds = ref(new Set<number>());

// Level colors with WCAG AAA contrast for white text
const levelColors: Record<LogLevel, string> = {
  DEBUG: "blue-grey-darken-2",
  INFO: "primary",
  WARN: "warning",
  ERROR: "error",
};

// Stats from store
const stats = computed(() => logStore.stats);

// Filtered entries
const filteredEntries = computed((): LogEntry[] => {
  let entries = logStore.entries;

  // Filter by level
  entries = entries.filter((e) => enabledLevels.value.includes(e.level));

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.message.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        (e.details && JSON.stringify(e.details).toLowerCase().includes(query)),
    );
  }

  // Return most recent first
  return [...entries].reverse();
});

// Toggle entry expansion
function toggleExpanded(id: number) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id);
  } else {
    expandedIds.value.add(id);
  }
}

// Format timestamp
function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Format details for display
function formatDetails(details: unknown): string {
  return JSON.stringify(details, null, 2);
}

// Download logs as JSON
function handleDownload() {
  exportLogsToJson(logStore.entries, logStore.stats);
}

// Clear all logs
async function handleClear() {
  const confirmed = await ask({
    title: "Clear Logs",
    message: "Clear all application logs? This cannot be undone.",
    confirmText: "Clear logs",
    cancelText: "Cancel",
    confirmColor: "error",
  });
  if (confirmed) {
    logStore.clearAll();
  }
}
</script>

<style scoped>
.log-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.modal-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-badge {
  background: rgba(var(--v-theme-primary), 0.12);
}

.modal-close-btn {
  min-width: 44px;
  min-height: 44px;
}

.border-bottom {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.stats-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
}

.log-list {
  flex: 1;
  overflow-y: auto;
  max-height: 420px;
  background: rgba(var(--v-theme-surface-variant), 0.1);
}

.log-entry {
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.log-entry:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.35);
  border-color: rgba(var(--v-border-color), 0.2);
}

.level-chip {
  width: 58px;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
}

.level-checkbox {
  min-height: 32px;
}

.border {
  border: 1px solid rgba(var(--v-border-color), 0.12);
}

.details-box {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
