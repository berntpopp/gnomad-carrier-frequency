<template>
  <v-footer
    app
    class="text-caption text-medium-emphasis justify-center ga-2"
  >
    <!-- GitHub -->
    <v-tooltip
      text="Source code on GitHub"
      location="top"
    >
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
          <v-icon size="small">
            mdi-github
          </v-icon>
        </v-btn>
      </template>
    </v-tooltip>

    <span class="mx-1">|</span>

    <!-- Version -->
    <a
      :href="releasesUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="text-decoration-none text-inherit"
    >
      v{{ version }}
    </a>

    <span class="mx-1">|</span>

    <!-- Data Sources Dialog -->
    <DataSourcesDialog>
      <template #activator="{ props }">
        <v-tooltip
          text="Data sources"
          location="top"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="{ ...props, ...tooltipProps }"
              icon
              variant="text"
              size="small"
              aria-label="View data sources"
            >
              <v-icon size="small">
                mdi-database
              </v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>
    </DataSourcesDialog>

    <span class="mx-1">|</span>

    <!-- Methodology Dialog -->
    <MethodologyDialog>
      <template #activator="{ props }">
        <v-tooltip
          text="Methodology"
          location="top"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="{ ...props, ...tooltipProps }"
              icon
              variant="text"
              size="small"
              aria-label="View calculation methodology"
            >
              <v-icon size="small">
                mdi-function-variant
              </v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>
    </MethodologyDialog>

    <!-- FAQ Dialog -->
    <FaqDialog>
      <template #activator="{ props }">
        <v-tooltip
          text="FAQ"
          location="top"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="{ ...props, ...tooltipProps }"
              icon
              variant="text"
              size="small"
              aria-label="View frequently asked questions"
            >
              <v-icon size="small">
                mdi-help-circle-outline
              </v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>
    </FaqDialog>

    <!-- About Dialog -->
    <AboutDialog>
      <template #activator="{ props }">
        <v-tooltip
          text="About"
          location="top"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="{ ...props, ...tooltipProps }"
              icon
              variant="text"
              size="small"
              aria-label="About this application"
            >
              <v-icon size="small">
                mdi-information-outline
              </v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>
    </AboutDialog>

    <span class="mx-1">|</span>

    <!-- Disclaimer (reopen) -->
    <v-tooltip
      text="View clinical disclaimer"
      location="top"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          variant="text"
          size="small"
          aria-label="View clinical disclaimer"
          @click="reopenDisclaimer"
        >
          <v-icon size="small">
            mdi-alert-circle-outline
          </v-icon>
        </v-btn>
      </template>
    </v-tooltip>
  </v-footer>
</template>

<script setup lang="ts">
import MethodologyDialog from '@/components/MethodologyDialog.vue';
import FaqDialog from '@/components/FaqDialog.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import DataSourcesDialog from '@/components/DataSourcesDialog.vue';
import { useAppStore } from '@/stores/useAppStore';

const version = import.meta.env.VITE_APP_VERSION;
const releasesUrl = 'https://github.com/berntpopp/gnomad-carrier-frequency/releases';

const appStore = useAppStore();

const reopenDisclaimer = () => {
  appStore.resetDisclaimer();
};
</script>

<style scoped>
.text-inherit {
  color: inherit;
}
</style>
