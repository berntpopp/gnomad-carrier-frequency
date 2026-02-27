// Re-export all types
export type {
  OrphanetDisease,
  OrphanetGeneAssociation,
  OrphanetGeneResult,
  OrphanetPrevalenceEntry,
  OrphanetResult,
} from "./types.js";

// Re-export public client API
export {
  fetchDiseasesByGeneSymbol,
  fetchEpidemiology,
  fetchNaturalHistory,
  fetchOrphanetData,
  selectBestPrevalence,
  selectPrimaryDisease,
} from "./client.js";
