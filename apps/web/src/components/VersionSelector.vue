<template>
  <v-select
    v-model="selectedVersion"
    :items="versions"
    item-title="displayName"
    item-value="version"
    label="gnomAD Version"
    variant="outlined"
    density="compact"
    hide-details
    @update:model-value="onVersionChange"
  >
    <template #item="{ item, props }">
      <v-list-item v-bind="props">
        <template #subtitle>
          {{ item.raw.referenceGenome }} - {{ item.raw.notes }}
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { getAvailableVersions, getGnomadVersion, type GnomadVersion } from '@/config';
import { useGnomadVersion } from '@/api';

const { version, setVersion } = useGnomadVersion();

// Get all available versions from config
const versions = computed(() =>
  getAvailableVersions().map((v) => getGnomadVersion(v))
);

const selectedVersion = ref(version.value);

// Keep selectedVersion in sync with global version
watch(version, (newVersion) => {
  selectedVersion.value = newVersion;
});

const onVersionChange = (v: GnomadVersion) => {
  setVersion(v);
};
</script>
