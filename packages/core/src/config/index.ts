// Type-safe configuration loader
// All magic numbers and strings come from here - NO HARDCODING elsewhere

import type {
  Config,
  GnomadConfig,
  GnomadVersion,
  GnomadVersionConfig,
  AppSettings,
  PopulationConfig,
  SubpopulationConfig,
} from "./types";

import gnomadConfig from "./gnomad.json";
import settingsConfig from "./settings.json";

// Type assertion - JSON imports are validated at build time
const gnomad = gnomadConfig as GnomadConfig;
const settings = settingsConfig as AppSettings;

// Unified config object
export const config: Config = {
  gnomad,
  settings,
};

// Helper: Get version config (defaults to configured default)
export function getGnomadVersion(version?: GnomadVersion): GnomadVersionConfig {
  const v = version ?? gnomad.defaultVersion;
  return gnomad.versions[v];
}

// Helper: Get population codes for a version
export function getPopulationCodes(version?: GnomadVersion): string[] {
  return getGnomadVersion(version).populations.map((p) => p.code);
}

// Helper: Get population label by code
export function getPopulationLabel(
  code: string,
  version?: GnomadVersion,
): string {
  const pop = getGnomadVersion(version).populations.find(
    (p) => p.code === code,
  );
  return pop?.label ?? code;
}

// Helper: Get all populations for a version
export function getPopulations(version?: GnomadVersion): PopulationConfig[] {
  return getGnomadVersion(version).populations;
}

// Helper: Build population labels map for a version
export function getPopulationLabels(
  version?: GnomadVersion,
): Record<string, string> {
  const pops = getPopulations(version);
  return Object.fromEntries(pops.map((p) => [p.code, p.label]));
}

// Helper: Get API endpoint for a version
export function getApiEndpoint(version?: GnomadVersion): string {
  return getGnomadVersion(version).apiEndpoint;
}

// Helper: Get dataset ID for a version
export function getDatasetId(version?: GnomadVersion): string {
  return getGnomadVersion(version).datasetId;
}

// Helper: Get reference genome for a version
export function getReferenceGenome(
  version?: GnomadVersion,
): "GRCh38" | "GRCh37" {
  return getGnomadVersion(version).referenceGenome;
}

// Helper: Get available versions
export function getAvailableVersions(): GnomadVersion[] {
  return Object.keys(gnomad.versions) as GnomadVersion[];
}

// Helper: Get flat list of all subcontinental subpopulations for a version
export function getSubpopulations(version?: GnomadVersion): SubpopulationConfig[] {
  const pops = getGnomadVersion(version).populations;
  return pops.flatMap((p) => p.subpopulations ?? []);
}

// Helper: Returns true if the version has subcontinental population data
export function hasSubcontinentalData(version?: GnomadVersion): boolean {
  return getSubpopulations(version).length > 0;
}

// Helper: Given a subpopulation code (e.g. "nfe_bgr"), returns the parent population code ("nfe")
// Returns null if not found in config
export function getSubpopulationParent(
  subCode: string,
  version?: GnomadVersion,
): string | null {
  const pops = getGnomadVersion(version).populations;
  for (const pop of pops) {
    if (pop.subpopulations?.some((s) => s.code === subCode)) {
      return pop.code;
    }
  }
  return null;
}

// Helper: Get label for a subcontinental subpopulation code; falls back to code if not found
export function getSubpopulationLabel(
  code: string,
  version?: GnomadVersion,
): string {
  const subs = getSubpopulations(version);
  const found = subs.find((s) => s.code === code);
  return found?.label ?? code;
}

// Re-export types for convenience
export type {
  Config,
  GnomadConfig,
  GnomadVersion,
  GnomadVersionConfig,
  AppSettings,
  PopulationConfig,
  SubpopulationConfig,
} from "./types";

// Re-export exclusion reasons config
export { EXCLUSION_REASONS } from "./exclusion-reasons";
export type { ExclusionReasonOption } from "./exclusion-reasons";
