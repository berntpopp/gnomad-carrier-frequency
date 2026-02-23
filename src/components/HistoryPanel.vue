<template>
  <div
    class="history-panel"
    data-testid="history-panel"
  >
    <div class="d-flex align-center mb-4">
      <h2 class="text-h6">
        Search History
      </h2>
      <v-spacer />
      <v-btn
        icon
        variant="text"
        size="small"
        aria-label="Close history panel"
        @click="emit('close')"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </div>

    <!-- Empty state -->
    <div
      v-if="historyStore.isEmpty"
      class="text-center py-8 text-medium-emphasis"
    >
      <v-icon
        size="48"
        class="mb-2"
      >
        mdi-history
      </v-icon>
      <p class="text-body-2">
        No search history yet
      </p>
      <p class="text-caption">
        Completed calculations will appear here
      </p>
    </div>

    <!-- History list grouped by date -->
    <template v-else>
      <div class="text-body-2 text-medium-emphasis mb-2">
        {{ historyStore.entryCount }} {{ historyStore.entryCount === 1 ? 'entry' : 'entries' }}
      </div>

      <div
        v-for="group in historyStore.groupedByDate"
        :key="group.date"
        class="mb-4"
      >
        <!-- Date header -->
        <div class="text-caption text-medium-emphasis mb-2 font-weight-medium">
          {{ group.date }}
        </div>

        <!-- Entries for this date -->
        <v-list
          density="compact"
          class="history-list"
        >
          <v-list-item
            v-for="entry in group.entries"
            :key="entry.id"
            class="history-entry rounded mb-1"
            data-testid="history-entry"
            @click="emit('restore', entry.id)"
          >
            <template #prepend>
              <v-icon
                color="primary"
                size="small"
              >
                mdi-dna
              </v-icon>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ entry.gene.symbol }}
            </v-list-item-title>

            <v-list-item-subtitle class="text-caption">
              {{ formatTime(entry.timestamp) }}
            </v-list-item-subtitle>

            <template #append>
              <v-chip
                size="x-small"
                color="success"
                variant="tonal"
                class="mr-2"
              >
                {{ formatFrequency(entry.results.globalCarrierFrequency) }}
              </v-chip>
              <v-btn
                icon
                variant="text"
                size="x-small"
                aria-label="Delete history entry"
                @click.stop="handleDelete(entry.id)"
              >
                <v-icon size="small">
                  mdi-delete-outline
                </v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useHistoryStore } from '@/stores/useHistoryStore';

const historyStore = useHistoryStore();

const emit = defineEmits<{
  close: [];
  restore: [id: string];
}>();

/**
 * Format timestamp to time string (e.g., "2:30 PM")
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format carrier frequency as ratio (e.g., "1:25")
 */
function formatFrequency(freq: number): string {
  if (freq <= 0) return 'N/A';
  return `1:${Math.round(1 / freq)}`;
}

/**
 * Handle delete with instant removal (no confirmation per CONTEXT.md)
 */
function handleDelete(id: string) {
  historyStore.deleteEntry(id);
}
</script>

<style scoped>
.history-panel {
  min-height: 200px;
}

.history-list {
  background: transparent;
}

.history-entry {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.history-entry:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
