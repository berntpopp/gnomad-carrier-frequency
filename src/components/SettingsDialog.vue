<template>
  <v-dialog
    v-model="modelValue"
    max-width="600"
    persistent
    @update:model-value="(val) => val ? onDialogOpen() : undefined"
  >
    <v-card ref="dialogCard">
      <v-card-title class="d-flex align-center">
        <span>Settings</span>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          @click="close"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-tabs v-model="activeTab">
        <v-tab value="general">General</v-tab>
        <v-tab value="filters">Filters</v-tab>
        <v-tab value="templates">Templates</v-tab>
      </v-tabs>

      <v-card-text>
        <v-tabs-window v-model="activeTab">
          <v-tabs-window-item value="general">
            <p class="text-body-2">General settings will appear here.</p>
          </v-tabs-window-item>
          <v-tabs-window-item value="filters">
            <p class="text-body-2">Filter configuration will appear here.</p>
          </v-tabs-window-item>
          <v-tabs-window-item value="templates">
            <p class="text-body-2">Template editing will appear here.</p>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap';

const modelValue = defineModel<boolean>();

const activeTab = ref('general');
const dialogCard = ref<HTMLElement | null>(null);

const { activate, deactivate } = useFocusTrap(dialogCard, {
  immediate: false,
  allowOutsideClick: true,
  escapeDeactivates: true,
  returnFocusOnDeactivate: true,
});

async function onDialogOpen() {
  await nextTick();
  activate();
}

function close() {
  deactivate();
  modelValue.value = false;
}

function save() {
  // Content will be added in later phases
  close();
}
</script>
