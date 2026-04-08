import { computed, ref, watch, type Ref } from "vue";
import type { GeneVariantsResponse } from "@gnomad-cf/core/queries";
import type { GnomadVariant, ClinVarVariant } from "@gnomad-cf/core/types";
import type { GnomadVersion } from "@gnomad-cf/core/config";
import { useGnomadVersion } from "@/api";

export interface UseGeneVariantsReturn {
  gene: Ref<GeneVariantsResponse["gene"]>;
  variants: Ref<GnomadVariant[]>;
  clinvarVariants: Ref<ClinVarVariant[]>;
  isLoading: Ref<boolean>;
  hasError: Ref<boolean>;
  errorMessage: Ref<string | null>;
  refetch: () => Promise<void>;
  hasData: Ref<boolean>;
  currentVersion: Ref<GnomadVersion>;
}

export function useGeneVariants(
  geneSymbol: Ref<string | null>,
): UseGeneVariantsReturn {
  const { version } = useGnomadVersion();

  const variants = ref<GnomadVariant[]>([]);
  const clinvarVariants = ref<ClinVarVariant[]>([]);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const hasData = ref(false);

  const gene = computed(() =>
    hasData.value ? ({} as GeneVariantsResponse["gene"]) : null,
  );
  const hasError = computed(() => errorMessage.value !== null);

  watch(geneSymbol, () => {
    variants.value = [];
    clinvarVariants.value = [];
    hasData.value = false;
    errorMessage.value = null;
  });

  const refetch = async () => {
    // No-op — refetch is triggered via worker in useCarrierFrequency
  };

  return {
    gene,
    variants,
    clinvarVariants,
    isLoading,
    hasError,
    errorMessage,
    refetch,
    hasData,
    currentVersion: version,
  };
}
