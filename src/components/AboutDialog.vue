<template>
  <v-dialog
    v-model="dialog"
    max-width="500"
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
          mdi-information
        </v-icon>
        About gCFCalc
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
        <div class="text-center mb-4">
          <v-icon
            size="64"
            color="primary"
          >
            mdi-dna
          </v-icon>
          <h2 class="text-h5 mt-2">
            gnomAD Carrier Frequency Calculator
          </h2>
          <p class="text-caption text-medium-emphasis">
            Version {{ version }}
          </p>
        </div>

        <p class="text-body-2 mb-4">
          A web-based tool for genetic counselors to calculate carrier frequencies
          for autosomal recessive conditions using gnomAD population data.
        </p>

        <v-list density="compact">
          <v-list-item>
            <template #prepend>
              <v-icon size="small">
                mdi-check
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              Direct gnomAD GraphQL API queries
            </v-list-item-title>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon size="small">
                mdi-check
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              Population-specific frequency calculations
            </v-list-item-title>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon size="small">
                mdi-check
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              German clinical documentation text generation
            </v-list-item-title>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon size="small">
                mdi-check
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              ClinGen gene-disease validity integration
            </v-list-item-title>
          </v-list-item>
        </v-list>

        <v-divider class="my-4" />

        <div class="text-body-2">
          <strong>Author:</strong> Bernt Popp
        </div>
        <div class="text-body-2 mt-2">
          <strong>License:</strong> MIT License
        </div>

        <div class="d-flex gap-2 mt-4">
          <v-btn
            variant="outlined"
            size="small"
            href="https://github.com/berntpopp/gnomad-carrier-frequency"
            target="_blank"
            rel="noopener noreferrer"
          >
            <v-icon
              start
              size="small"
            >
              mdi-github
            </v-icon>
            GitHub
          </v-btn>
          <v-btn
            variant="outlined"
            size="small"
            href="https://github.com/berntpopp/gnomad-carrier-frequency/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            <v-icon
              start
              size="small"
            >
              mdi-bug
            </v-icon>
            Report Issue
          </v-btn>
        </div>
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

const dialog = ref(false);
const version = import.meta.env.VITE_APP_VERSION;
</script>
