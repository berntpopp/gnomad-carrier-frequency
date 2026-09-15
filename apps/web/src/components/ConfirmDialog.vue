<template>
  <v-dialog
    v-model="isVisible"
    max-width="440"
    data-testid="confirm-dialog"
    @click:outside="cancel"
  >
    <v-card class="modal-card" rounded="lg">
      <v-card-title class="d-flex align-center px-6 pt-5 pb-3">
        <div class="modal-icon-badge warning-badge mr-3">
          <v-icon size="22" :color="options.confirmColor || 'warning'">
            {{
              options.confirmColor === "error"
                ? "mdi-alert-circle"
                : "mdi-help-circle-outline"
            }}
          </v-icon>
        </div>
        <div>
          <div class="text-h6 font-weight-bold">{{ options.title }}</div>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="px-6 py-4 text-body-1 text-high-emphasis">
        {{ options.message }}
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn
          v-if="options.cancelText !== ''"
          variant="outlined"
          min-height="44"
          min-width="90"
          @click="cancel"
        >
          {{ options.cancelText || "Cancel" }}
        </v-btn>
        <v-btn
          :color="options.confirmColor || 'primary'"
          variant="flat"
          min-height="44"
          min-width="90"
          @click="confirm"
        >
          {{ options.confirmText || "OK" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useConfirmDialog } from "@/composables/useConfirmDialog";

const { isVisible, options, confirm, cancel } = useConfirmDialog();
</script>

<style scoped>
.modal-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.16) !important;
}

.modal-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.warning-badge {
  background: rgba(var(--v-theme-warning), 0.12);
}
</style>
