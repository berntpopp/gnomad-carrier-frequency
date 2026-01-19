<template>
  <v-footer
    app
    class="text-caption text-medium-emphasis justify-center ga-2"
  >
    <v-tooltip text="Source code on GitHub" location="top">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          variant="text"
          size="small"
          href="https://github.com/berntpopp/gnomad-carrier-frequency"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon size="small">mdi-github</v-icon>
        </v-btn>
      </template>
    </v-tooltip>

    <span class="mx-2">|</span>

    <a
      :href="releasesUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="text-decoration-none text-inherit"
    >
      v{{ version }}
    </a>

    <span class="mx-2">|</span>

    <v-tooltip text="gnomAD database" location="top">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          variant="text"
          size="small"
          href="https://gnomad.broadinstitute.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon size="small">mdi-database</v-icon>
        </v-btn>
      </template>
    </v-tooltip>
  </v-footer>
</template>

<script setup lang="ts">
const version = import.meta.env.VITE_APP_VERSION;
const releasesUrl = 'https://github.com/berntpopp/gnomad-carrier-frequency/releases';
</script>

<style scoped>
.text-inherit {
  color: inherit;
}
</style>
