<template>
  <div class="pa-3">
    <v-row dense>
      <v-col cols="12" sm="6" md="3">
        <div class="text-caption font-weight-bold text-grey-darken-2">
          Transcript
        </div>
        <div class="text-body-2">
          {{ item.transcriptId || "-" }}
        </div>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <div class="text-caption font-weight-bold text-grey-darken-2">
          Position
        </div>
        <div class="text-body-2">
          {{ item.pos.toLocaleString() }}
        </div>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <div class="text-caption font-weight-bold text-grey-darken-2">
          Ref / Alt
        </div>
        <div class="text-body-2 text-mono">
          {{ item.ref }} / {{ item.alt }}
        </div>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <div class="text-caption font-weight-bold text-grey-darken-2">
          Allele Count / Number
        </div>
        <div class="text-body-2">
          {{ item.alleleCount.toLocaleString() }} /
          {{ item.alleleNumber.toLocaleString() }}
        </div>
      </v-col>
    </v-row>

    <!-- Flags row -->
    <div class="d-flex flex-wrap ga-2 mt-2">
      <v-chip
        v-if="item.isLoF"
        color="error"
        size="small"
        variant="tonal"
      >
        <v-icon start size="x-small"> mdi-alert-circle </v-icon>
        LoF HC
      </v-chip>
      <v-chip
        v-if="item.lof && item.lof !== 'HC'"
        color="warning"
        size="small"
        variant="tonal"
      >
        LoF {{ item.lof }}
      </v-chip>
      <v-chip
        v-if="item.isMissense"
        color="secondary"
        size="small"
        variant="tonal"
      >
        Missense
      </v-chip>
      <v-chip
        v-if="item.isClinvarPathogenic"
        color="error"
        size="small"
        variant="tonal"
      >
        <v-icon start size="x-small"> mdi-alert </v-icon>
        ClinVar P/LP
      </v-chip>
      <v-chip
        v-if="isConflicting"
        color="deep-orange"
        size="small"
        variant="tonal"
      >
        <v-icon start size="x-small"> mdi-alert </v-icon>
        Conflicting (majority P/LP)
      </v-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DisplayVariant } from "@gnomad-cf/core/types";

const props = defineProps<{
  item: DisplayVariant;
}>();

const isConflicting = computed(() => {
  if (!props.item.clinvarStatus) return false;
  return props.item.clinvarStatus.toLowerCase().includes("conflicting");
});
</script>

<style scoped>
.text-mono {
  font-family: monospace;
}
</style>
