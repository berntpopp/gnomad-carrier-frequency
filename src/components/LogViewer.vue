<template>
  <div class="log-viewer">
    <!-- Header with actions -->
    <div class="d-flex align-center justify-space-between mb-3">
      <h3 class="text-h6">
        Application Logs
      </h3>
      <v-btn
        icon
        variant="text"
        size="small"
        aria-label="Close log viewer"
        @click="emit('close')"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </div>

    <!-- Statistics -->
    <v-card
      variant="tonal"
      density="compact"
      class="mb-3 pa-2"
    >
      <div class="d-flex flex-wrap ga-4 text-body-2">
        <span>
          <strong>{{ stats.totalCount }}</strong> entries
        </span>
        <span
          v-if="stats.droppedCount > 0"
          class="text-warning"
        >
          <strong>{{ stats.droppedCount }}</strong> dropped
        </span>
        <span class="text-medium-emphasis">
          {{ stats.memoryEstimate }}
        </span>
      </div>
      <div class="d-flex flex-wrap ga-2 mt-1 text-caption">
        <v-chip
          v-for="level in levels"
          :key="level"
          size="x-small"
          :color="levelColors[level]"
          variant="flat"
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
        label="Search logs"
        density="compact"
        variant="outlined"
        hide-details
        clearable
      />

      <div class="d-flex flex-wrap ga-2">
        <v-checkbox
          v-for="level in levels"
          :key="level"
          v-model="enabledLevels"
          :value="level"
          :label="level"
          :color="levelColors[level]"
          density="compact"
          hide-details
        />
      </div>
    </div>

    <!-- Log entries -->
    <v-list
      density="compact"
      class="log-list rounded border"
    >
      <template v-if="filteredEntries.length > 0">
        <v-list-item
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="log-entry"
          @click="toggleExpanded(entry.id)"
        >
          <template #prepend>
            <v-chip
              size="x-small"
              :color="levelColors[entry.level]"
              variant="flat"
              class="mr-2"
              style="width: 60px; justify-content: center"
            >
              {{ entry.level }}
            </v-chip>
          </template>

          <v-list-item-title class="text-body-2">
            <span class="text-medium-emphasis mr-2">
              {{ formatTimestamp(entry.timestamp) }}
            </span>
            <span class="font-weight-medium mr-2">[{{ entry.category }}]</span>
            {{ entry.message }}
          </v-list-item-title>

          <!-- Expanded details -->
          <div
            v-if="expandedIds.has(entry.id) && entry.details"
            class="mt-2 pa-2 rounded bg-grey-darken-4"
          >
            <pre class="text-caption text-wrap">{{ formatDetails(entry.details) }}</pre>
          </div>
        </v-list-item>
      </template>

      <v-list-item v-else>
        <v-list-item-title class="text-medium-emphasis text-center">
          No logs match current filters
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- Actions -->
    <div class="d-flex flex-wrap ga-2 mt-3">
      <v-btn
        variant="outlined"
        size="small"
        prepend-icon="mdi-download"
        @click="handleDownload"
      >
        Download JSON
      </v-btn>

      <v-btn
        variant="outlined"
        size="small"
        color="warning"
        prepend-icon="mdi-delete"
        @click="handleClear"
      >
        Clear Logs
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useLogStore } from '@/stores/useLogStore';
import { useExport } from '@/composables';
import type { LogLevel, LogEntry } from '@/types';

const emit = defineEmits<{
  close: [];
}>();

const logStore = useLogStore();
const { exportLogsToJson } = useExport();

// Filter state
const searchQuery = ref('');
const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
const enabledLevels = ref<LogLevel[]>(['INFO', 'WARN', 'ERROR']);
const expandedIds = ref(new Set<number>());

// Level colors
const levelColors: Record<LogLevel, string> = {
  DEBUG: 'grey',
  INFO: 'info',
  WARN: 'warning',
  ERROR: 'error',
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
        (e.details && JSON.stringify(e.details).toLowerCase().includes(query))
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
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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
function handleClear() {
  if (confirm('Clear all application logs?')) {
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

.log-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.log-entry {
  cursor: pointer;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.log-entry:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
}

.border {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

pre {
  margin: 0;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
