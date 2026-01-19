<template>
  <v-card
    variant="outlined"
    class="variable-picker"
  >
    <v-card-title class="text-subtitle-2 py-2">
      Insert Variable
    </v-card-title>

    <v-card-text class="pa-2">
      <v-expansion-panels
        variant="accordion"
        density="compact"
      >
        <v-expansion-panel
          v-for="category in categories"
          :key="category.id"
        >
          <v-expansion-panel-title class="text-body-2">
            {{ category.label }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list
              density="compact"
              class="pa-0"
            >
              <v-list-item
                v-for="variable in category.variables"
                :key="variable.name"
                class="variable-item"
                @click="emit('select', variable.name)"
              >
                <template #prepend>
                  <v-chip
                    size="x-small"
                    color="primary"
                    variant="flat"
                    class="mr-2"
                  >
                    {{ formatVariable(variable.name) }}
                  </v-chip>
                </template>
                <v-list-item-title class="text-body-2">
                  {{ variable.description }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  Example: {{ variable.example }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  TEMPLATE_VARIABLES,
  type TemplateVariable,
} from '@/config/template-variables';

const emit = defineEmits<{
  select: [variableName: string];
}>();

interface Category {
  id: TemplateVariable['category'];
  label: string;
  variables: TemplateVariable[];
}

function formatVariable(name: string): string {
  return `{{${name}}}`;
}

const categories = computed((): Category[] => {
  const categoryLabels: Record<TemplateVariable['category'], string> = {
    gene: 'Gene',
    frequency: 'Frequency',
    risk: 'Risk',
    context: 'Context',
    formatting: 'Formatting (German)',
  };

  return (Object.keys(categoryLabels) as TemplateVariable['category'][])
    .map((id) => ({
      id,
      label: categoryLabels[id],
      variables: TEMPLATE_VARIABLES.filter((v) => v.category === id),
    }))
    .filter((cat) => cat.variables.length > 0);
});
</script>

<style scoped>
.variable-picker {
  max-height: 400px;
  overflow-y: auto;
}

.variable-item {
  cursor: pointer;
  border-radius: 4px;
}

.variable-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
