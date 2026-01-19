import { computed, watch, type Ref } from 'vue';
import { useQuery } from 'villus';
import { GENE_VARIANTS_QUERY } from '@/api/queries/gene-variants';
import type {
  GeneVariantsResponse,
  GeneVariant,
  GeneClinvarVariant,
} from '@/api/queries/types';
import { getDatasetId, getReferenceGenome, type GnomadVersion } from '@/config';
import { useGnomadVersion } from '@/api';
import { useLogger } from './useLogger';

export interface UseGeneVariantsReturn {
  gene: Ref<GeneVariantsResponse['gene']>;
  variants: Ref<GeneVariant[]>;
  clinvarVariants: Ref<GeneClinvarVariant[]>;
  isLoading: Ref<boolean>;
  hasError: Ref<boolean>;
  errorMessage: Ref<string | null>;
  refetch: () => Promise<void>;
  hasData: Ref<boolean>;
  currentVersion: Ref<GnomadVersion>;
}

export function useGeneVariants(
  geneSymbol: Ref<string | null>
): UseGeneVariantsReturn {
  const { version } = useGnomadVersion();
  const logger = useLogger('api');

  // Variables use dataset and referenceGenome from config
  const variables = computed(() => ({
    geneSymbol: geneSymbol.value?.toUpperCase() ?? '',
    dataset: getDatasetId(version.value), // From config: 'gnomad_r4', etc.
    referenceGenome: getReferenceGenome(version.value), // From config: 'GRCh38', etc.
  }));

  const { data, isFetching, error, execute } = useQuery<GeneVariantsResponse>({
    query: GENE_VARIANTS_QUERY,
    variables,
    skip: () => !geneSymbol.value,
    cachePolicy: 'cache-first',
  });

  // Log API request/response tracking
  watch(
    () => geneSymbol.value,
    (symbol) => {
      if (symbol) {
        logger.debug('Fetching gene variants', {
          gene: symbol,
          dataset: getDatasetId(version.value),
          referenceGenome: getReferenceGenome(version.value),
        });
      }
    }
  );

  watch(
    () => data.value,
    (response) => {
      if (response?.gene) {
        logger.info('Gene variants loaded', {
          gene: geneSymbol.value,
          variantCount: response.gene.variants?.length ?? 0,
          clinvarCount: response.gene.clinvar_variants?.length ?? 0,
        });
      }
    }
  );

  watch(
    () => error.value,
    (err) => {
      if (err) {
        logger.error('Gene variants request failed', {
          gene: geneSymbol.value,
          error: err.message,
        });
      }
    }
  );

  const gene = computed(() => data.value?.gene ?? null);
  const variants = computed(() => gene.value?.variants ?? []);
  const clinvarVariants = computed(() => gene.value?.clinvar_variants ?? []);
  const hasData = computed(() => gene.value !== null);

  const hasError = computed(
    () =>
      !!error.value ||
      (geneSymbol.value !== null && data.value !== undefined && gene.value === null && !isFetching.value)
  );

  const errorMessage = computed(() => {
    if (error.value) {
      const msg = error.value.message;
      // GENE-03: Invalid gene shows clear error message
      if (msg.includes('not found') || msg.includes('does not exist')) {
        return `Gene "${geneSymbol.value}" not found in gnomAD. Please check the gene symbol.`;
      }
      // API-02: Handle API errors gracefully
      if (msg.includes('timeout') || msg.includes('network')) {
        return 'Network error. Please check your connection and try again.';
      }
      return 'Failed to load variant data. Please try again.';
    }
    // Gene exists in search but has no data
    if (data.value !== undefined && gene.value === null && geneSymbol.value) {
      return `Gene "${geneSymbol.value}" not found in gnomAD database.`;
    }
    return null;
  });

  const refetch = async () => {
    await execute();
  };

  return {
    gene,
    variants,
    clinvarVariants,
    isLoading: isFetching,
    hasError,
    errorMessage,
    refetch,
    hasData,
    currentVersion: version,
  };
}
