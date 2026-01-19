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
        <v-icon start>
          mdi-function-variant
        </v-icon>
        {{ methodology.title }}
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

      <v-card-text class="methodology-content">
        <template
          v-for="section in methodology.sections"
          :key="section.id"
        >
          <h3 class="text-h6 mt-4 mb-2">
            {{ section.title }}
          </h3>
          <p class="text-body-2 mb-3">
            {{ section.content }}
          </p>

          <!-- Formula display -->
          <v-card
            v-if="section.formula"
            variant="tonal"
            class="mb-4 pa-3"
          >
            <div class="text-subtitle-2 mb-2">
              Genotype Frequencies:
            </div>
            <div
              v-for="item in section.formula.genotypes"
              :key="item.genotype"
              class="d-flex align-center mb-1"
            >
              <code class="mr-2">{{ item.frequency }}</code>
              <span class="text-body-2">{{ item.genotype }}</span>
            </div>
          </v-card>

          <!-- Steps list -->
          <v-card
            v-if="section.steps"
            variant="outlined"
            class="mb-4 pa-3"
          >
            <div
              v-for="step in section.steps"
              :key="step"
              class="text-body-2 mb-1"
            >
              {{ step }}
            </div>
          </v-card>

          <!-- Bullet list -->
          <ul
            v-if="section.list"
            class="text-body-2 mb-4"
          >
            <li
              v-for="item in section.list"
              :key="item"
            >
              {{ item }}
            </li>
          </ul>
        </template>
      </v-card-text>

      <v-divider />

      <v-card-actions>
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
import methodology from '@/config/help/methodology.json';

const dialog = ref(false);
</script>

<style scoped>
.methodology-content code {
  background-color: rgba(var(--v-theme-surface-variant), 0.4);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
