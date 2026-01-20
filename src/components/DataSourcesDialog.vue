<template>
  <v-dialog
    v-model="dialog"
    max-width="500"
    aria-label="Data Sources"
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
          mdi-database
        </v-icon>
        Data Sources
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
        <p class="text-body-2 mb-4">
          This calculator uses the following data sources:
        </p>

        <!-- gnomAD -->
        <v-card
          variant="outlined"
          class="mb-3"
        >
          <v-card-title class="text-subtitle-1">
            <v-icon
              start
              size="small"
            >
              mdi-database
            </v-icon>
            gnomAD
          </v-card-title>
          <v-card-text>
            <div class="text-body-2 mb-2">
              Genome Aggregation Database - Population allele frequencies
            </div>
            <div class="d-flex align-center gap-2">
              <v-chip
                size="small"
                color="primary"
                variant="tonal"
              >
                Selected: {{ gnomadVersion }}
              </v-chip>
            </div>
            <div class="text-caption text-medium-emphasis mt-2">
              Available versions: v4.1 (GRCh38), v2.1.1 (GRCh37)
            </div>
            <v-btn
              variant="text"
              size="small"
              class="mt-2 px-0"
              href="https://gnomad.broadinstitute.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit gnomAD
              <v-icon
                end
                size="small"
              >
                mdi-open-in-new
              </v-icon>
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- ClinVar (from gnomAD) -->
        <v-card
          variant="outlined"
          class="mb-3"
        >
          <v-card-title class="text-subtitle-1">
            <v-icon
              start
              size="small"
            >
              mdi-medical-bag
            </v-icon>
            ClinVar
          </v-card-title>
          <v-card-text>
            <div class="text-body-2 mb-2">
              Clinical variant annotations - Pathogenicity classifications
            </div>
            <div class="text-caption text-medium-emphasis">
              ClinVar annotations are provided through gnomAD's data integration.
              The ClinVar version corresponds to the gnomAD release date.
            </div>
            <v-btn
              variant="text"
              size="small"
              class="mt-2 px-0"
              href="https://www.ncbi.nlm.nih.gov/clinvar/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit ClinVar
              <v-icon
                end
                size="small"
              >
                mdi-open-in-new
              </v-icon>
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- ClinGen -->
        <v-card
          variant="outlined"
          class="mb-3"
        >
          <v-card-title class="text-subtitle-1">
            <v-icon
              start
              size="small"
            >
              mdi-check-decagram
            </v-icon>
            ClinGen
          </v-card-title>
          <v-card-text>
            <div class="text-body-2 mb-2">
              Gene-Disease Validity curations
            </div>
            <div class="d-flex align-center gap-2">
              <v-chip
                size="small"
                :color="clingenExpired ? 'warning' : 'success'"
                variant="tonal"
              >
                Cache: {{ clingenCacheAge }}
              </v-chip>
              <v-chip
                size="small"
                variant="outlined"
              >
                {{ clingenEntryCount }} entries
              </v-chip>
            </div>
            <div class="text-caption text-medium-emphasis mt-2">
              Data refreshes automatically every 30 days.
            </div>
            <v-btn
              variant="text"
              size="small"
              class="mt-2 px-0"
              href="https://clinicalgenome.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit ClinGen
              <v-icon
                end
                size="small"
              >
                mdi-open-in-new
              </v-icon>
            </v-btn>
          </v-card-text>
        </v-card>

        <v-alert
          type="info"
          variant="tonal"
          density="compact"
        >
          <div class="text-caption">
            All data is queried in real-time from these sources.
            No patient data is stored or transmitted.
          </div>
        </v-alert>
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
import { useGnomadVersion } from '@/api';
import { useClingenValidity } from '@/composables';

const dialog = ref(false);

const { version } = useGnomadVersion();
const gnomadVersion = version;

const {
  isExpired: clingenExpired,
  cacheAge: clingenCacheAge,
  entryCount: clingenEntryCount,
} = useClingenValidity();
</script>
