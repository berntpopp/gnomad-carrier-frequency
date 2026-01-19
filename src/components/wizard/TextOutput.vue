<template>
  <v-card
    class="mt-4"
    variant="outlined"
  >
    <!-- Header row -->
    <v-card-title class="d-flex align-center flex-wrap ga-2 pb-0">
      <span>{{ labels.title }}</span>
      <v-spacer />

      <!-- Language toggle -->
      <v-btn-toggle
        v-model="languageModel"
        mandatory
        density="compact"
        variant="outlined"
      >
        <v-btn
          value="de"
          size="small"
        >
          DE
        </v-btn>
        <v-btn
          value="en"
          size="small"
        >
          EN
        </v-btn>
      </v-btn-toggle>

      <!-- Gender style selector (German only) -->
      <v-select
        v-if="language === 'de'"
        v-model="genderStyleModel"
        :items="genderStyleOptions"
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 160px"
      />

      <!-- Patient sex selector (German only) -->
      <v-select
        v-if="language === 'de'"
        v-model="patientSexModel"
        :items="patientSexOptions"
        :label="labels.patientSex"
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 200px"
      />
    </v-card-title>

    <v-card-text>
      <!-- Perspective selector -->
      <div class="mb-4">
        <div class="text-body-2 text-medium-emphasis mb-2">
          {{ labels.perspective }}
        </div>
        <v-btn-toggle
          v-model="selectedPerspective"
          mandatory
          density="compact"
          color="primary"
          variant="outlined"
        >
          <v-btn
            value="affected"
            size="small"
          >
            {{ labels.perspectives.affected }}
          </v-btn>
          <v-btn
            value="carrier"
            size="small"
          >
            {{ labels.perspectives.carrier }}
          </v-btn>
          <v-btn
            value="familyMember"
            size="small"
          >
            {{ labels.perspectives.familyMember }}
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- Section toggles -->
      <div class="mb-4">
        <div class="text-body-2 text-medium-emphasis mb-2">
          {{ labels.sections }}
        </div>
        <div class="d-flex flex-wrap ga-2">
          <v-chip
            v-for="section in availableSections"
            :key="section.id"
            :variant="section.enabled ? 'elevated' : 'outlined'"
            :color="section.enabled ? 'primary' : undefined"
            size="small"
            @click="toggleSection(selectedPerspective, section.id)"
          >
            {{ section.label }}
          </v-chip>
        </div>
      </div>

      <!-- Text preview -->
      <v-card
        variant="tonal"
        class="mb-4"
      >
        <v-card-text>
          <pre
            class="text-body-2"
            style="white-space: pre-wrap; font-family: inherit; margin: 0;"
          >{{ generatedText || labels.noText }}</pre>
        </v-card-text>
      </v-card>

      <!-- Copy button -->
      <v-btn
        :color="copied ? 'success' : 'primary'"
        :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
        :disabled="!generatedText"
        variant="elevated"
        @click="copy(generatedText)"
      >
        {{ copied ? labels.copied : labels.copy }}
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useClipboard } from '@vueuse/core';
import { useTextGenerator } from '@/composables';
import type {
  Perspective,
  GenderStyle,
  PatientSex,
  FrequencySource,
  IndexPatientStatus,
  CarrierFrequencyResult,
} from '@/types';

const props = defineProps<{
  result: CarrierFrequencyResult | null;
  frequencySource: FrequencySource;
  indexStatus: IndexPatientStatus;
  literatureFrequency: number | null;
  literaturePmid: string | null;
  usingDefault: boolean;
}>();

const selectedPerspective = ref<Perspective>('affected');

// Pass props as getter function to composable
const {
  generateText,
  getSections,
  language,
  genderStyle,
  patientSex,
  setLanguage,
  setGenderStyle,
  setPatientSex,
  toggleSection,
} = useTextGenerator(() => ({
  result: props.result,
  frequencySource: props.frequencySource,
  indexStatus: props.indexStatus,
  literatureFrequency: props.literatureFrequency,
  literaturePmid: props.literaturePmid,
  usingDefault: props.usingDefault,
}));

// Two-way binding models for Vuetify components
const languageModel = computed({
  get: () => language.value,
  set: (val: 'de' | 'en') => setLanguage(val),
});

const genderStyleModel = computed({
  get: () => genderStyle.value,
  set: (val: GenderStyle) => setGenderStyle(val),
});

const patientSexModel = computed({
  get: () => patientSex.value,
  set: (val: PatientSex) => setPatientSex(val),
});

// Gender style options for select
const genderStyleOptions = computed(() => [
  { value: '*', title: labels.value.genderStyles['*'] },
  { value: ':', title: labels.value.genderStyles[':'] },
  { value: '/', title: labels.value.genderStyles['/'] },
  { value: 'traditional', title: labels.value.genderStyles.traditional },
]);

// Patient sex options for select
const patientSexOptions = computed(() => [
  { value: 'male', title: labels.value.patientSexOptions.male },
  { value: 'female', title: labels.value.patientSexOptions.female },
  { value: 'neutral', title: labels.value.patientSexOptions.neutral },
]);

// Clipboard
const { copy, copied } = useClipboard({
  legacy: true,
  copiedDuring: 2000,
});

// Generated text (reactive to perspective and section changes)
const generatedText = computed(() => generateText(selectedPerspective.value));

// Available sections for current perspective
const availableSections = computed(() => getSections(selectedPerspective.value));

// UI labels based on language
const labels = computed(() =>
  language.value === 'de'
    ? {
        title: 'Klinischer Text',
        perspective: 'Perspektive',
        sections: 'Abschnitte',
        copy: 'Text kopieren',
        copied: 'Kopiert!',
        noText: 'Kein Text generiert. Bitte mindestens einen Abschnitt aktivieren.',
        patientSex: 'Patient*in',
        perspectives: {
          affected: 'Betroffener Patient',
          carrier: 'Anlagetrager/in',
          familyMember: 'Familienmitglied',
        },
        genderStyles: {
          '*': 'Genderstern (*)',
          ':': 'Doppelpunkt (:)',
          '/': 'Schragstrich (/)',
          traditional: 'Traditionell',
        },
        patientSexOptions: {
          male: 'Mannlich (der Patient)',
          female: 'Weiblich (die Patientin)',
          neutral: 'Neutral (der/die Patient*in)',
        },
      }
    : {
        title: 'Clinical Text',
        perspective: 'Perspective',
        sections: 'Sections',
        copy: 'Copy text',
        copied: 'Copied!',
        noText: 'No text generated. Please enable at least one section.',
        patientSex: 'Patient Sex',
        perspectives: {
          affected: 'Affected Patient',
          carrier: 'Carrier',
          familyMember: 'Family Member',
        },
        genderStyles: {
          '*': 'Asterisk (*)',
          ':': 'Colon (:)',
          '/': 'Slash (/)',
          traditional: 'Traditional',
        },
        patientSexOptions: {
          male: 'Male',
          female: 'Female',
          neutral: 'Neutral',
        },
      }
);
</script>
