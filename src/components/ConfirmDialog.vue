<template>
  <v-dialog
    v-model="isVisible"
    max-width="400"
    data-testid="confirm-dialog"
    @click:outside="cancel"
  >
    <v-card>
      <v-card-title>{{ options.title }}</v-card-title>
      <v-card-text>{{ options.message }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          v-if="options.cancelText !== ''"
          variant="text"
          @click="cancel"
        >
          {{ options.cancelText || 'Cancel' }}
        </v-btn>
        <v-btn
          :color="options.confirmColor || 'primary'"
          variant="flat"
          @click="confirm"
        >
          {{ options.confirmText || 'OK' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useConfirmDialog } from '@/composables/useConfirmDialog';

const { isVisible, options, confirm, cancel } = useConfirmDialog();
</script>
