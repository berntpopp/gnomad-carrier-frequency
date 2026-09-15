<template>
  <!-- Loading skeleton -->
  <div
    v-if="loading"
    class="mt-4 pt-3"
    style="
      border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    "
    data-testid="orphanet-section"
  >
    <v-skeleton-loader type="text" width="55%" />
  </div>

  <!-- Content: primary disease + optional expansion + disclaimer -->
  <div
    v-else-if="primaryDisease"
    class="mt-4 pt-3"
    style="
      border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    "
    data-testid="orphanet-section"
  >
    <!-- Primary disease row -->
    <div class="d-flex align-center flex-wrap ga-1">
      <span class="text-caption text-medium-emphasis mr-1"
        >Orphanet Prevalence</span
      >

      <a
        :href="primaryDisease.orphanetUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-body-2 orphanet-link"
        >{{ primaryDisease.name }}</a
      >

      <span
        v-if="primaryDisease.isAutosomalRecessive"
        class="text-caption text-medium-emphasis"
        >[AR]</span
      >

      <span
        v-if="primaryDisease.bestPrevalence"
        class="text-body-2 text-medium-emphasis"
      >
        &mdash; {{ primaryDisease.bestPrevalence.prevalenceClass }}
        <span v-if="primaryDisease.bestPrevalence.geographic">
          ({{ primaryDisease.bestPrevalence.geographic }})
        </span>
      </span>

      <!-- +N more chip -->
      <v-chip
        v-if="additionalDiseases.length > 0"
        size="small"
        variant="tonal"
        class="ml-1 orphanet-more-chip"
        @click="expanded = !expanded"
      >
        {{ expanded ? "show less" : `+${additionalDiseases.length} more` }}
      </v-chip>
    </div>

    <!-- Expanded list of additional diseases -->
    <v-expand-transition>
      <div v-if="expanded" class="ml-2 mt-1">
        <div
          v-for="disease in additionalDiseases"
          :key="disease.orphacode"
          class="d-flex align-center flex-wrap ga-1 mt-1"
        >
          <a
            :href="disease.orphanetUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-body-2 orphanet-link"
            >{{ disease.name }}</a
          >

          <span
            v-if="disease.isAutosomalRecessive"
            class="text-caption text-medium-emphasis"
            >[AR]</span
          >

          <span
            v-if="disease.bestPrevalence"
            class="text-body-2 text-medium-emphasis"
          >
            &mdash; {{ disease.bestPrevalence.prevalenceClass }}
            <span v-if="disease.bestPrevalence.geographic">
              ({{ disease.bestPrevalence.geographic }})
            </span>
          </span>
        </div>
      </div>
    </v-expand-transition>

    <!-- Disclaimer -->
    <div class="text-caption text-medium-emphasis mt-1">
      Orphanet reports clinical prevalence (diagnosed cases), not genetic
      carrier prevalence.
    </div>
  </div>

  <!-- No diseases or error: render nothing -->
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { OrphanetDisease } from "@gnomad-cf/core/orphanet";

defineProps<{
  /** True while Orphanet data is being fetched */
  loading: boolean;
  /** Full list of enriched diseases (used to derive counts) */
  diseases: OrphanetDisease[];
  /** Primary disease to display (AR preferred + highest valMoy) */
  primaryDisease: OrphanetDisease | undefined;
  /** Additional diseases for +N more expansion (only those with bestPrevalence) */
  additionalDiseases: OrphanetDisease[];
}>();

/** Controls the +N more expand/collapse state */
const expanded = ref(false);
</script>

<style scoped>
.orphanet-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 4px;
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-underline-offset: 3px;
}

.orphanet-more-chip {
  min-height: 36px;
  cursor: pointer;
}
</style>
