<template>
  <v-footer
    app
    class="footer-container text-caption text-medium-emphasis"
    data-testid="app-footer"
  >
    <div class="footer-content">
      <!-- Primary row: GitHub, Version -->
      <div class="footer-row footer-primary">
        <!-- GitHub -->
        <v-tooltip
          text="Source code on GitHub"
          location="top"
          aria-label="Source code on GitHub"
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

        <!-- Version -->
        <a
          :href="releasesUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-decoration-none text-inherit"
        >
          v{{ version }}
        </a>

        <!-- Disclaimer (reopen) -->
        <v-tooltip
          text="View clinical disclaimer"
          location="top"
          aria-label="View clinical disclaimer"
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
      </div>

      <!-- Secondary row: Info buttons (hidden on very small screens, show on sm+) -->
      <div class="footer-row footer-secondary d-none d-sm-flex">
        <!-- Data Sources Dialog -->
        <DataSourcesDialog>
          <template #activator="{ props }">
            <v-tooltip
              text="Data sources"
              location="top"
              aria-label="Data sources"
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

        <!-- Methodology Dialog -->
        <MethodologyDialog>
          <template #activator="{ props }">
            <v-tooltip
              text="Methodology"
              location="top"
              aria-label="Methodology"
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
              aria-label="Frequently asked questions"
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
              aria-label="About this application"
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

        <!-- Log Viewer -->
        <v-tooltip
          text="View application logs"
          location="top"
          aria-label="View application logs"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              size="small"
              aria-label="View application logs"
              @click="emit('openLogViewer')"
            >
              <v-icon size="small">
                mdi-console
              </v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </div>

      <!-- Mobile menu button (visible only on xs screens) -->
      <v-menu
        location="top"
        class="d-sm-none"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            variant="text"
            size="small"
            aria-label="More options"
            class="d-sm-none"
          >
            <v-icon size="small">
              mdi-dots-horizontal
            </v-icon>
          </v-btn>
        </template>
        <v-list density="compact">
          <DataSourcesDialog>
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-database"
                title="Data Sources"
              />
            </template>
          </DataSourcesDialog>
          <MethodologyDialog>
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-function-variant"
                title="Methodology"
              />
            </template>
          </MethodologyDialog>
          <FaqDialog>
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-help-circle-outline"
                title="FAQ"
              />
            </template>
          </FaqDialog>
          <AboutDialog>
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-information-outline"
                title="About"
              />
            </template>
          </AboutDialog>
          <v-list-item
            prepend-icon="mdi-console"
            title="View Logs"
            @click="emit('openLogViewer')"
          />
        </v-list>
      </v-menu>
    </div>
  </v-footer>
</template>

<script setup lang="ts">
import MethodologyDialog from '@/components/MethodologyDialog.vue';
import FaqDialog from '@/components/FaqDialog.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import DataSourcesDialog from '@/components/DataSourcesDialog.vue';
import { useAppStore } from '@/stores/useAppStore';

const emit = defineEmits<{
  openLogViewer: [];
}>();

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

.footer-container {
  padding: 4px 8px;
}

.footer-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.footer-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer-primary {
  /* Always visible */
}

.footer-secondary {
  /* Hidden on xs, visible on sm+ via Vuetify display classes */
}

/* Compact spacing on mobile */
@media (max-width: 599px) {
  .footer-container {
    padding: 2px 4px;
  }

  .footer-content {
    gap: 2px;
  }
}
</style>
