<template>
  <v-app>
    <v-main>
      <v-container max-width="900">
        <h1 class="text-h4 mb-2">gnomAD Carrier Frequency Calculator</h1>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Calculate carrier frequency and recurrence risk from gnomAD population data.
        </p>

        <WizardStepper />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import WizardStepper from '@/components/wizard/WizardStepper.vue';
</script>
