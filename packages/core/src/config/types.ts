// gnomAD version identifiers
export type GnomadVersion = 'v4' | 'v3' | 'v2';

// Population code varies by version
export interface PopulationConfig {
  code: string;
  label: string;
  description?: string;
}

// Version-specific gnomAD configuration
export interface GnomadVersionConfig {
  version: GnomadVersion;
  displayName: string;
  apiEndpoint: string;
  datasetId: string;
  referenceGenome: 'GRCh38' | 'GRCh37';
  populations: PopulationConfig[];
  notes?: string;
}

// Full gnomAD configuration
export interface GnomadConfig {
  defaultVersion: GnomadVersion;
  versions: Record<GnomadVersion, GnomadVersionConfig>;
}

// Application settings (non-gnomAD specific)
export interface AppSettings {
  // Calculation thresholds
  founderEffectMultiplier: number; // Population > Nx global = founder effect
  lowSampleSizeThreshold: number; // AN below this = low sample warning
  defaultCarrierFrequency: number; // Fallback when no qualifying variants (1/100)

  // UI behavior
  debounceMs: number; // Autocomplete debounce delay
  minSearchChars: number; // Min chars before autocomplete triggers
  maxAutocompleteResults: number; // Limit suggestions shown

  // Display
  frequencyDecimalPlaces: number; // Decimal places for percentage display
}

// Combined config type
export interface Config {
  gnomad: GnomadConfig;
  settings: AppSettings;
}
