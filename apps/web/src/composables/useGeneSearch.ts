import { computed, ref, watch, type Ref } from 'vue';
import { useQuery } from 'villus';
import { useDebounceFn } from '@vueuse/core';
import { GENE_SEARCH_QUERY, GENE_DETAILS_QUERY } from '@gnomad-cf/core/queries';
import type {
  GeneSearchResponse,
  GeneSearchResult,
  GeneDetailsResponse,
} from '@gnomad-cf/core/queries';
import { config, getReferenceGenome } from '@gnomad-cf/core/config';
import { useGnomadVersion, graphqlClient } from '@/api';
import type { GeneConstraint } from '@gnomad-cf/core/types';

// Get settings from config - NO HARDCODED VALUES
const { debounceMs, minSearchChars, maxAutocompleteResults } = config.settings;

// Module-level state for singleton pattern - shared across all consumers
const sharedGeneConstraint = ref<GeneConstraint | null>(null);
const sharedConstraintLoading = ref(false);

// Promoted to module-level so all callers share the same reactive state
const searchTerm = ref('');
const debouncedTerm = ref('');
const selectedGene = ref<GeneSearchResult | null>(null);

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
  geneConstraint: Ref<GeneConstraint | null>;
  constraintLoading: Ref<boolean>;
  prefillGene: (symbol: string) => Promise<GeneSearchResult>;
}

export function useGeneSearch(): UseGeneSearchReturn {
  const { version } = useGnomadVersion();

  // Debounce using timing from config
  const setSearchTerm = useDebounceFn((term: string) => {
    // Normalize to uppercase for gnomAD (GENE-02: case-insensitive)
    debouncedTerm.value = term.trim().toUpperCase();
  }, debounceMs); // From config.settings.debounceMs

  // Watch raw input and trigger debounced update
  const updateSearchTerm = (term: string) => {
    searchTerm.value = term;
    // Clear selection when user types a different gene name.
    // Don't clear on empty string — v-autocomplete resets its search model
    // during stepper transitions, which would incorrectly deselect the gene.
    if (selectedGene.value && term.length > 0 && term.toUpperCase() !== selectedGene.value.symbol) {
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

  // Fetch constraint data for a selected gene
  const fetchConstraint = async (symbol: string) => {
    sharedConstraintLoading.value = true;
    sharedGeneConstraint.value = null;

    try {
      const { data: constraintData, error: queryError } =
        await graphqlClient.executeQuery<GeneDetailsResponse>({
          query: GENE_DETAILS_QUERY,
          variables: {
            geneSymbol: symbol,
            referenceGenome: getReferenceGenome(version.value),
          },
        });

      if (queryError) {
        return;
      }

      if (constraintData?.gene?.gnomad_constraint) {
        const c = constraintData.gene.gnomad_constraint;
        sharedGeneConstraint.value = {
          pLI: c.pLI,
          loeuf: c.oe_lof_upper,
          oeLof: c.oe_lof,
          oeLofLower: c.oe_lof_lower,
          expLof: c.exp_lof,
          obsLof: c.obs_lof,
          lofZ: c.lof_z,
          flags: c.flags,
        };
      }
    } catch {
      // Silently handle error
    } finally {
      sharedConstraintLoading.value = false;
    }
  };

  const selectGene = (gene: GeneSearchResult) => {
    selectedGene.value = gene;
    searchTerm.value = gene.symbol;
    debouncedTerm.value = ''; // Stop searching

    // Fetch constraint data when gene is selected
    fetchConstraint(gene.symbol);
  };

  const clearSelection = () => {
    selectedGene.value = null;
    searchTerm.value = '';
    debouncedTerm.value = '';
    sharedGeneConstraint.value = null;
  };

  const isValidGene = computed(() => selectedGene.value !== null);

  /**
   * Programmatically search for and select a gene by symbol.
   * Bypasses debounce by setting debouncedTerm directly.
   * Returns a Promise that resolves when the gene is selected.
   *
   * Used by WelcomeCard for the "Try with CFTR" quick-start button.
   */
  const prefillGene = (symbol: string): Promise<GeneSearchResult> => {
    const normalised = symbol.trim().toUpperCase();

    return new Promise((resolve, reject) => {
      // Bypass debounce: set both raw and debounced term immediately
      searchTerm.value = symbol;
      debouncedTerm.value = normalised;

      // Reject after 5 seconds if no results arrive
      const timeout = setTimeout(() => {
        stop();
        reject(new Error(`Gene not found: ${symbol}`));
      }, 5000);

      // One-shot watcher on results - fires when query returns data
      const stop = watch(
        results,
        (newResults) => {
          if (newResults.length > 0) {
            clearTimeout(timeout);
            stop();
            // Find exact match or fall back to first result
            const exactMatch = newResults.find((g) => g.symbol === normalised);
            const match = exactMatch ?? newResults[0]!;
            selectGene(match);
            resolve(match);
          }
        },
        { immediate: false },
      );
    });
  };

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
    geneConstraint: sharedGeneConstraint,
    constraintLoading: sharedConstraintLoading,
    prefillGene,
  };
}
