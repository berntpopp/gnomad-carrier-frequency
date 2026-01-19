<template>
  <v-dialog
    v-model="dialog"
    max-width="700"
    scrollable
  >
    <template #activator="{ props }">
      <slot
        name="activator"
        :props="props"
      />
    </template>

    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-help-circle</v-icon>
        {{ faq.title }}
        <v-spacer />
        <v-btn
          icon
          variant="text"
          @click="dialog = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text>
        <v-expansion-panels
          v-model="openPanels"
          variant="accordion"
          multiple
        >
          <template
            v-for="category in faq.categories"
            :key="category.id"
          >
            <!-- Category header -->
            <div class="text-overline text-medium-emphasis mt-4 mb-2">
              {{ category.title }}
            </div>

            <!-- Questions in category -->
            <v-expansion-panel
              v-for="item in category.questions"
              :key="item.id"
              :title="item.question"
            >
              <v-expansion-panel-text>
                <p class="text-body-2">{{ item.answer }}</p>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </template>
        </v-expansion-panels>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-btn
          variant="text"
          size="small"
          @click="openPanels = []"
        >
          Collapse All
        </v-btn>
        <v-spacer />
        <v-btn
          variant="text"
          @click="dialog = false"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import faq from '@/config/help/faq.json';

const dialog = ref(false);
const openPanels = ref<number[]>([]);
</script>
