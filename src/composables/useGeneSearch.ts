import { computed, ref, type Ref } from 'vue';
import { useQuery } from 'villus';
import { useDebounceFn } from '@vueuse/core';
import { GENE_SEARCH_QUERY } from '@/api/queries/gene-search';
import type { GeneSearchResponse, GeneSearchResult } from '@/api/queries/types';
import { config, getReferenceGenome } from '@/config';
import { useGnomadVersion } from '@/api';

// Get settings from config - NO HARDCODED VALUES
const { debounceMs, minSearchChars, maxAutocompleteResults } = config.settings;

export interface UseGeneSearchReturn {
  searchTerm: Ref<string>;
  setSearchTerm: (term: string) => void;
  results: Ref<GeneSearchResult[]>;
  isLoading: Ref<boolean>;
  error: Ref<Error | null>;
  selectedGene: Ref<GeneSearchResult | null>;
  selectGene: (gene: GeneSearchResult) => void;
  clearSelection: () => void;
  isValidGene: Ref<boolean>;
}

export function useGeneSearch(): UseGeneSearchReturn {
  const { version } = useGnomadVersion();

  const searchTerm = ref('');
  const debouncedTerm = ref('');
  const selectedGene = ref<GeneSearchResult | null>(null);

  // Debounce using timing from config
  const setSearchTerm = useDebounceFn((term: string) => {
    // Normalize to uppercase for gnomAD (GENE-02: case-insensitive)
    debouncedTerm.value = term.trim().toUpperCase();
  }, debounceMs); // From config.settings.debounceMs

  // Watch raw input and trigger debounced update
  const updateSearchTerm = (term: string) => {
    searchTerm.value = term;
    // Clear selection when user types
    if (selectedGene.value && term.toUpperCase() !== selectedGene.value.symbol) {
      selectedGene.value = null;
    }
    setSearchTerm(term);
  };

  // Variables use referenceGenome from config based on current version
  const variables = computed(() => ({
    query: debouncedTerm.value,
    referenceGenome: getReferenceGenome(version.value), // From config
  }));

  const { data, isFetching, error } = useQuery<GeneSearchResponse>({
    query: GENE_SEARCH_QUERY,
    variables,
    skip: () =>
      debouncedTerm.value.length < minSearchChars || // From config
      selectedGene.value !== null,
  });

  // Limit results from config
  const results = computed(() =>
    (data.value?.gene_search ?? []).slice(0, maxAutocompleteResults)
  );

  const selectGene = (gene: GeneSearchResult) => {
    selectedGene.value = gene;
    searchTerm.value = gene.symbol;
    debouncedTerm.value = ''; // Stop searching
  };

  const clearSelection = () => {
    selectedGene.value = null;
    searchTerm.value = '';
    debouncedTerm.value = '';
  };

  const isValidGene = computed(() => selectedGene.value !== null);

  return {
    searchTerm,
    setSearchTerm: updateSearchTerm,
    results,
    isLoading: isFetching,
    error: computed(() => error.value ?? null),
    selectedGene,
    selectGene,
    clearSelection,
    isValidGene,
  };
}
