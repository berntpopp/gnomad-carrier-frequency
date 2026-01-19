<template>
  <v-footer
    app
    class="text-caption text-medium-emphasis justify-center ga-2"
  >
    <v-tooltip text="Source code on GitHub" location="top" aria-label="Source code on GitHub">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          variant="text"
          size="small"
          href="https://github.com/berntpopp/gnomad-carrier-frequency"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Source code on GitHub"
        >
          <v-icon size="small">mdi-github</v-icon>
        </v-btn>
      </template>
    </v-tooltip>

    <span class="mx-1">|</span>

    <a
      :href="releasesUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="text-decoration-none text-inherit"
    >
      v{{ version }}
    </a>

    <span class="mx-1">|</span>

    <v-tooltip text="gnomAD database" location="top" aria-label="gnomAD database">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          variant="text"
          size="small"
          href="https://gnomad.broadinstitute.org/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="gnomAD database"
        >
          <v-icon size="small">mdi-database</v-icon>
        </v-btn>
      </template>
    </v-tooltip>

    <span class="mx-1">|</span>

    <!-- Methodology Dialog -->
    <MethodologyDialog>
      <template #activator="{ props }">
        <v-tooltip text="Calculation methodology" location="top">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="{ ...props, ...tooltipProps }"
              icon
              variant="text"
              size="small"
              aria-label="View calculation methodology"
            >
              <v-icon size="small">mdi-function-variant</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>
    </MethodologyDialog>

    <!-- FAQ Dialog -->
    <FaqDialog>
      <template #activator="{ props }">
        <v-tooltip text="FAQ" location="top">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="{ ...props, ...tooltipProps }"
              icon
              variant="text"
              size="small"
              aria-label="View frequently asked questions"
            >
              <v-icon size="small">mdi-help-circle-outline</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>
    </FaqDialog>
  </v-footer>
</template>

<script setup lang="ts">
import MethodologyDialog from '@/components/MethodologyDialog.vue';
import FaqDialog from '@/components/FaqDialog.vue';

const version = import.meta.env.VITE_APP_VERSION;
const releasesUrl = 'https://github.com/berntpopp/gnomad-carrier-frequency/releases';
</script>

<style scoped>
.text-inherit {
  color: inherit;
}
</style>
