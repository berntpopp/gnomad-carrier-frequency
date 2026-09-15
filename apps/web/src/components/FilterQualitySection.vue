<template>
  <v-row dense class="filter-quality-section">
    <v-col cols="12">
      <v-divider class="mb-3" />
      <div class="text-subtitle-2 mb-2">Quality Flag Exclusions</div>
      <div class="text-caption text-medium-emphasis mb-3">
        Exclude flagged variants from the carrier frequency calculation.
        {{ flaggedCount }} of {{ variantCount }} variant(s) flagged.
      </div>
    </v-col>

    <v-col cols="12" md="6">
      <v-switch
        :model-value="qualityExclusionConfig.excludeHighAf"
        color="error"
        label="Exclude High AF"
        :density="smAndDown ? 'default' : 'compact'"
        hide-details
        @update:model-value="
          emit('updateQualityExclusion', 'excludeHighAf', $event as boolean)
        "
      />
    </v-col>

    <v-col cols="12" md="6">
      <v-switch
        :model-value="qualityExclusionConfig.excludeHighHom"
        color="orange"
        label="Exclude High Hom"
        :density="smAndDown ? 'default' : 'compact'"
        hide-details
        @update:model-value="
          emit('updateQualityExclusion', 'excludeHighHom', $event as boolean)
        "
      />
    </v-col>

    <v-col cols="12" md="6">
      <v-switch
        :model-value="qualityExclusionConfig.excludeGnomadFiltered"
        color="amber"
        label="Exclude gnomAD Filtered"
        :density="smAndDown ? 'default' : 'compact'"
        hide-details
        @update:model-value="
          emit(
            'updateQualityExclusion',
            'excludeGnomadFiltered',
            $event as boolean,
          )
        "
      />
    </v-col>

    <v-col cols="12" md="6">
      <v-switch
        :model-value="qualityExclusionConfig.excludeGenomesOnly"
        color="blue-grey"
        label="Exclude Genomes Only"
        :density="smAndDown ? 'default' : 'compact'"
        hide-details
        @update:model-value="
          emit(
            'updateQualityExclusion',
            'excludeGenomesOnly',
            $event as boolean,
          )
        "
      />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";
import type { QualityExclusionConfig } from "@gnomad-cf/core/types";

defineProps<{
  qualityExclusionConfig: QualityExclusionConfig;
  flaggedCount: number;
  variantCount: number;
}>();

const emit = defineEmits<{
  updateQualityExclusion: [key: keyof QualityExclusionConfig, value: boolean];
}>();

const { smAndDown } = useDisplay();
</script>
