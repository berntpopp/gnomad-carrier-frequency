import { computed, ref, watch, type Ref } from 'vue';
import { useQuery } from 'villus';
import { useDebounceFn } from '@vueuse/core';
import { GENE_SEARCH_QUERY, GENE_DETAILS_QUERY } from '@/api/queries/gene-search';
import type {
  GeneSearchResponse,
  GeneSearchResult,
  GeneDetailsResponse,
} from '@/api/queries/types';
import { config, getReferenceGenome } from '@/config';
import { useGnomadVersion, graphqlClient } from '@/api';
import { useLogger } from './useLogger';
import type { GeneConstraint } from '@/types';

// Get settings from config - NO HARDCODED VALUES
const { debounceMs, minSearchChars, maxAutocompleteResults } = config.settings;

// Module-level state for singleton pattern - shared across all consumers
const sharedGeneConstraint = ref<GeneConstraint | null>(null);
const sharedConstraintLoading = ref(false);

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
}

export function useGeneSearch(): UseGeneSearchReturn {
  const { version } = useGnomadVersion();
  const logger = useLogger('search');

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

  // Log search operations
  watch(
    () => debouncedTerm.value,
    (term) => {
      if (term && term.length >= minSearchChars) {
        logger.debug('Gene search', { query: term });
      }
    }
  );

  watch(
    () => error.value,
    (err) => {
      if (err) {
        logger.warn('Gene search failed', {
          query: debouncedTerm.value,
          error: err.message,
        });
      }
    }
  );

  // Fetch constraint data for a selected gene
  const fetchConstraint = async (symbol: string) => {
    sharedConstraintLoading.value = true;
    sharedGeneConstraint.value = null;

    logger.debug('Fetching gene constraint', { gene: symbol });

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
        logger.warn('Constraint query error', { gene: symbol, error: String(queryError) });
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
        logger.info('Gene constraint loaded', {
          gene: symbol,
          pLI: c.pLI,
          loeuf: c.oe_lof_upper,
        });
      }
    } catch (err) {
      logger.error('Constraint fetch error', {
        gene: symbol,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      sharedConstraintLoading.value = false;
    }
  };

  const selectGene = (gene: GeneSearchResult) => {
    selectedGene.value = gene;
    searchTerm.value = gene.symbol;
    debouncedTerm.value = ''; // Stop searching

    logger.info('Gene selected', {
      symbol: gene.symbol,
      name: gene.name,
    });

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
  };
}
