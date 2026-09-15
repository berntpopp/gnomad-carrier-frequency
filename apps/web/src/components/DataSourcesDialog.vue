<template>
  <v-dialog v-model="dialog" max-width="500" aria-label="Data Sources">
    <template #activator="{ props }">
      <slot name="activator" :props="props" />
    </template>

    <v-card class="modal-card" rounded="lg">
      <v-card-title class="d-flex align-center px-6 pt-5 pb-3">
        <div class="modal-icon-badge primary-badge mr-3">
          <v-icon size="22" color="primary">mdi-database</v-icon>
        </div>
        <div>
          <div class="text-h6 font-weight-bold">Data Sources</div>
          <div class="text-caption text-medium-emphasis">
            Genomic reference databases and curations
          </div>
        </div>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          aria-label="Close data sources"
          class="modal-close-btn"
          @click="dialog = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="px-6 py-4">
        <p class="text-body-2 text-medium-emphasis mb-4">
          This calculator queries authoritative genomic and clinical curation
          sources in real time:
        </p>

        <!-- gnomAD -->
        <div class="source-card mb-3">
          <div class="d-flex align-center justify-space-between mb-1">
            <div class="d-flex align-center gap-2">
              <v-icon size="small" color="primary" class="mr-1"
                >mdi-database</v-icon
              >
              <strong class="text-subtitle-2 font-weight-bold">gnomAD</strong>
            </div>
            <v-chip
              size="small"
              color="primary"
              variant="tonal"
              class="font-mono"
            >
              Selected: {{ gnomadVersion }}
            </v-chip>
          </div>
          <div class="text-body-2 mb-2">
            Genome Aggregation Database &mdash; Population allele frequencies
            from &gt;800,000 exomes and genomes.
          </div>
          <div class="text-caption text-medium-emphasis mb-2 font-mono">
            Supported: v4.1 (GRCh38), v2.1.1 (GRCh37)
          </div>
          <v-btn
            variant="text"
            size="small"
            min-height="44"
            class="px-2"
            href="https://gnomad.broadinstitute.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit gnomAD
            <v-icon end size="small">mdi-open-in-new</v-icon>
          </v-btn>
        </div>

        <!-- ClinVar (from gnomAD) -->
        <div class="source-card mb-3">
          <div class="d-flex align-center gap-2 mb-1">
            <v-icon size="small" color="info" class="mr-1"
              >mdi-medical-bag</v-icon
            >
            <strong class="text-subtitle-2 font-weight-bold">ClinVar</strong>
          </div>
          <div class="text-body-2 mb-2">
            Clinical variant annotations &mdash; Pathogenicity classifications
            (P/LP submissions).
          </div>
          <div class="text-caption text-medium-emphasis mb-2">
            Annotations integrated directly via gnomAD GraphQL API.
          </div>
          <v-btn
            variant="text"
            size="small"
            min-height="44"
            class="px-2"
            href="https://www.ncbi.nlm.nih.gov/clinvar/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit ClinVar
            <v-icon end size="small">mdi-open-in-new</v-icon>
          </v-btn>
        </div>

        <!-- ClinGen -->
        <div class="source-card mb-3">
          <div class="d-flex align-center justify-space-between mb-1">
            <div class="d-flex align-center gap-2">
              <v-icon size="small" color="success" class="mr-1"
                >mdi-check-decagram</v-icon
              >
              <strong class="text-subtitle-2 font-weight-bold">ClinGen</strong>
            </div>
            <div class="d-flex align-center ga-1">
              <v-chip
                size="small"
                :color="clingenExpired ? 'warning' : 'success'"
                variant="tonal"
                class="font-mono"
              >
                Cache: {{ clingenCacheAge }}
              </v-chip>
              <v-chip size="small" variant="outlined" class="font-mono">
                {{ clingenEntryCount }} entries
              </v-chip>
            </div>
          </div>
          <div class="text-body-2 mb-2">
            Clinical Genome Resource &mdash; Gene-Disease Validity curations
            (Definitive, Strong, Moderate).
          </div>
          <div class="text-caption text-medium-emphasis mb-2">
            Cached locally and refreshed automatically every 30 days.
          </div>
          <v-btn
            variant="text"
            size="small"
            min-height="44"
            class="px-2"
            href="https://clinicalgenome.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit ClinGen
            <v-icon end size="small">mdi-open-in-new</v-icon>
          </v-btn>
        </div>

        <v-alert type="info" variant="tonal" density="comfortable" class="mt-4">
          <div class="text-caption">
            All data is queried dynamically from official public endpoints. No
            patient data is ever recorded, stored, or transmitted.
          </div>
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn
          variant="outlined"
          min-height="44"
          min-width="100"
          @click="dialog = false"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useGnomadVersion } from "@/api";
import { useClingenValidity } from "@/composables";

const dialog = ref(false);

const { version } = useGnomadVersion();
const gnomadVersion = version;

const {
  isExpired: clingenExpired,
  cacheAge: clingenCacheAge,
  entryCount: clingenEntryCount,
} = useClingenValidity();
</script>

<style scoped>
.modal-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.16) !important;
}

.modal-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-badge {
  background: rgba(var(--v-theme-primary), 0.12);
}

.modal-close-btn {
  min-width: 44px;
  min-height: 44px;
}

.source-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 8px;
  padding: 12px 14px;
  background: rgba(var(--v-theme-surface-variant), 0.2);
  transition: border-color 0.15s ease;
}

.source-card:hover {
  border-color: rgba(var(--v-border-color), 0.3);
}
</style>
