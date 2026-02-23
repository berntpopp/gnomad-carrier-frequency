import { useAnnouncer } from '@vue-a11y/announcer'

/**
 * Application-specific announcer wrapper.
 * Provides typed methods for common announcement patterns.
 *
 * Uses polite for non-urgent updates (calculation results, loading states).
 * Uses assertive for urgent messages (errors).
 */
export function useAppAnnouncer() {
  const { polite, assertive } = useAnnouncer()

  /**
   * Announce calculation results to screen readers.
   * Example: "Carrier frequency calculated: 1 in 25 for European population"
   */
  function announceCalculation(ratio: string, population: string) {
    polite(`Carrier frequency calculated: ${ratio} for ${population} population`)
  }

  /**
   * Announce error messages immediately.
   * Example: "Error: Gene BRCA1 not found in gnomAD"
   */
  function announceError(message: string) {
    assertive(`Error: ${message}`)
  }

  /**
   * Announce loading state changes.
   * @param what - What is loading (e.g., "gene data", "variant data")
   * @param done - If true, announces completion instead of start
   */
  function announceLoading(what: string, done = false) {
    polite(done ? `${what} loaded` : `Loading ${what}...`)
  }

  /**
   * Announce wizard step changes.
   * Example: "Step 2: Select Population"
   */
  function announceStep(stepNumber: number, stepName: string) {
    polite(`Step ${stepNumber}: ${stepName}`)
  }

  /**
   * Announce gene selection.
   * Example: "Selected gene: CFTR"
   */
  function announceGeneSelection(geneSymbol: string) {
    polite(`Selected gene: ${geneSymbol}`)
  }

  return {
    polite,
    assertive,
    announceCalculation,
    announceError,
    announceLoading,
    announceStep,
    announceGeneSelection,
  }
}

export type UseAppAnnouncerReturn = ReturnType<typeof useAppAnnouncer>
