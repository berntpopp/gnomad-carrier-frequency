<template>
  <v-app>
    <VueAnnouncer class="sr-only" />
    <AppBar @openSettings="showSettings = true" />

    <v-main>
      <v-container max-width="900">
        <h1 class="text-h4 mb-2">
          gnomAD Carrier Frequency Calculator
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Calculate carrier frequency and recurrence risk from gnomAD population data.
        </p>

        <WizardStepper />
      </v-container>
    </v-main>

    <AppFooter />

    <SettingsDialog v-model="showSettings" />
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppBar from '@/components/AppBar.vue';
import AppFooter from '@/components/AppFooter.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import WizardStepper from '@/components/wizard/WizardStepper.vue';

const showSettings = ref(false);
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
