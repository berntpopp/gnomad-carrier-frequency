import { GeneConfigSchema } from "./schema.js";
import type { GeneConfig } from "./schema.js";

/**
 * In-memory registry of pre-registered gene configs.
 * Keys are uppercase gene symbols (e.g., 'CFTR', 'HEXA').
 */
const registry: Map<string, GeneConfig> = new Map();

/**
 * Optional platform-specific loader for filesystem-based config loading.
 * Injected by CLI/Node contexts via setPlatformLoader().
 * The function receives a gene symbol and returns a Promise<unknown> (raw JSON).
 */
let platformLoader: ((symbol: string) => Promise<unknown>) | null = null;

/**
 * Register a gene config in the in-memory registry.
 * The config is keyed by its geneSymbol (uppercased).
 */
export function registerGeneConfig(config: GeneConfig): void {
  registry.set(config.geneSymbol.toUpperCase(), config);
}

/**
 * Inject a platform-specific loader (e.g., fs.readFile-based for CLI).
 * When set, loadGeneConfig will call this on registry miss.
 * The loader receives the original gene symbol and must return raw JSON (unknown).
 */
export function setPlatformLoader(
  loader: (symbol: string) => Promise<unknown>,
): void {
  platformLoader = loader;
}

/**
 * Load a gene config by symbol (case-insensitive).
 *
 * Resolution order:
 * 1. In-memory registry (fastest — pre-registered configs)
 * 2. Platform loader (CLI/Node filesystem loader, if injected)
 * 3. null (unknown gene)
 */
export async function loadGeneConfig(
  symbol: string,
): Promise<GeneConfig | null> {
  const upperSymbol = symbol.toUpperCase();

  // 1. Check in-memory registry
  const cached = registry.get(upperSymbol);
  if (cached !== undefined) {
    return cached;
  }

  // 2. Try platform loader (CLI filesystem, etc.)
  if (platformLoader !== null) {
    try {
      const raw = await platformLoader(symbol);
      // null/undefined means the gene has no config — this is the normal case
      // for most genes (e.g. GitHub raw returns 404). Not an error.
      if (raw == null) {
        return null;
      }
      const result = GeneConfigSchema.safeParse(raw);
      if (result.success) {
        registry.set(upperSymbol, result.data);
        return result.data;
      } else {
        console.warn(
          `[gene-config] Invalid config for gene "${symbol}":`,
          result.error.issues.map((i) => i.message).join(", "),
        );
        return null;
      }
    } catch {
      // Platform loader failure (network error, timeout, etc.) for a gene
      // config is not critical — the app works fine without gene-specific
      // configs. Silently return null to avoid noisy console warnings.
      return null;
    }
  }

  // 3. Unknown gene
  return null;
}

/**
 * Get the list of registered gene symbols (uppercased).
 * Useful for discoverability and listing available configs.
 */
export function getRegisteredGenes(): string[] {
  return Array.from(registry.keys());
}
