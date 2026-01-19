<template>
  <v-footer app class="text-caption text-medium-emphasis justify-center">
    <a
      :href="releasesUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="text-decoration-none text-inherit"
    >
      v{{ version }}
    </a>
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
