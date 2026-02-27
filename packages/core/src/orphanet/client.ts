import type {
  OrphanetDisease,
  OrphanetGeneResult,
  OrphanetPrevalenceEntry,
  OrphanetResult,
} from "./types.js";

const ORPHANET_BASE = "https://api.orphadata.com";
const FETCH_TIMEOUT_MS = 5000;

/**
 * Fetch with a 5-second AbortController timeout.
 * Throws on network error, abort, or non-200 response.
 * clearTimeout is called in both success and failure paths.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Returns diseases associated with a gene symbol.
 * CRITICAL: gene symbol is always lowercased — uppercase returns 404 from Orphanet API.
 */
export async function fetchDiseasesByGeneSymbol(
  geneSymbol: string,
): Promise<OrphanetGeneResult[]> {
  const symbol = geneSymbol.toLowerCase();
  const url = `${ORPHANET_BASE}/rd-associated-genes/genes/symbols/${symbol}`;
  const res = await fetchWithTimeout(url);
  const data = (await res.json()) as {
    data: { results: OrphanetGeneResult[] };
  };
  return data.data.results;
}

/**
 * Returns prevalence entries for an orphacode.
 * Returns [] on 404 (many disease subtypes lack epidemiology data per Pitfall 2).
 * Returns [] on any network or parse error.
 */
export async function fetchEpidemiology(
  orphacode: number,
): Promise<OrphanetPrevalenceEntry[]> {
  try {
    const url = `${ORPHANET_BASE}/rd-epidemiology/orphacodes/${orphacode}`;
    const res = await fetchWithTimeout(url);
    const data = (await res.json()) as {
      data: { results: { Prevalence?: OrphanetPrevalenceEntry[] } };
    };
    return data.data.results.Prevalence ?? [];
  } catch {
    // 404 or network error — treat as "no prevalence data for this disease"
    return [];
  }
}

/**
 * Returns the TypeOfInheritance string array for an orphacode.
 * Returns [] on 404 or any error.
 */
export async function fetchNaturalHistory(
  orphacode: number,
): Promise<string[]> {
  try {
    const url = `${ORPHANET_BASE}/rd-natural_history/orphacodes/${orphacode}`;
    const res = await fetchWithTimeout(url);
    const data = (await res.json()) as {
      data: { results: { TypeOfInheritance?: string[] } };
    };
    return data.data.results.TypeOfInheritance ?? [];
  } catch {
    return [];
  }
}

/**
 * Selects the best prevalence entry from a list using this priority:
 * 1. PrevalenceValidationStatus: "Validated" before "Not yet validated"
 * 2. PrevalenceType: "Point prevalence" > "Prevalence at birth" > others
 * 3. PrevalenceGeographic: "Europe" preferred; "Specific population" deprioritized
 *
 * Returns null for empty input.
 */
export function selectBestPrevalence(
  entries: OrphanetPrevalenceEntry[],
): OrphanetPrevalenceEntry | null {
  if (entries.length === 0) return null;

  const typeOrder = ["Point prevalence", "Prevalence at birth"];

  const sorted = [...entries].sort((a, b) => {
    // 1. Validated first
    const aVal = a.PrevalenceValidationStatus === "Validated" ? 0 : 1;
    const bVal = b.PrevalenceValidationStatus === "Validated" ? 0 : 1;
    if (aVal !== bVal) return aVal - bVal;

    // 2. Preferred type order
    const aTypeIdx = typeOrder.indexOf(a.PrevalenceType);
    const bTypeIdx = typeOrder.indexOf(b.PrevalenceType);
    const aTypeScore = aTypeIdx === -1 ? 99 : aTypeIdx;
    const bTypeScore = bTypeIdx === -1 ? 99 : bTypeIdx;
    if (aTypeScore !== bTypeScore) return aTypeScore - bTypeScore;

    // 3. Europe preferred; "Specific population" deprioritized
    const geoScore = (geo: string): number => {
      if (geo === "Europe") return 0;
      if (geo === "Specific population") return 2;
      return 1;
    };
    return geoScore(a.PrevalenceGeographic) - geoScore(b.PrevalenceGeographic);
  });

  return sorted[0] ?? null;
}

/**
 * Selects the primary disease from an enriched list.
 * - Filters to AR diseases first; if any exist, uses only those as candidates.
 * - Among candidates, sorts by highest bestPrevalence.valMoy descending.
 * - Returns first result, or undefined if list is empty.
 */
export function selectPrimaryDisease(
  diseases: OrphanetDisease[],
): OrphanetDisease | undefined {
  const arDiseases = diseases.filter((d) => d.isAutosomalRecessive);
  const candidates = arDiseases.length > 0 ? arDiseases : diseases;

  return [...candidates].sort(
    (a, b) => (b.bestPrevalence?.valMoy ?? 0) - (a.bestPrevalence?.valMoy ?? 0),
  )[0];
}

/**
 * Orchestrates the full two-step Orphanet fetch for a gene symbol.
 *
 * 1. Fetch gene-disease associations (gene symbol → ORPHAcodes).
 * 2. For each ORPHAcode, fetch epidemiology + natural history in parallel.
 * 3. Enrich each disease with AR inheritance flag and best prevalence entry.
 *
 * Returns an OrphanetResult with diseases array. On top-level failure, returns
 * empty diseases array with error string.
 */
export async function fetchOrphanetData(
  geneSymbol: string,
): Promise<OrphanetResult> {
  try {
    const geneResults = await fetchDiseasesByGeneSymbol(geneSymbol);

    const enrichedResults = await Promise.allSettled(
      geneResults.map(async (result): Promise<OrphanetDisease> => {
        const orphacode = result.ORPHAcode;
        const name = result["Preferred term"];

        // Construct URL from orphacode as safe fallback (per RESEARCH.md Open Question 2)
        const orphanetUrl =
          result.OrphanetURL ||
          `https://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=en&Expert=${orphacode}`;

        // Fetch epidemiology and natural history in parallel for this orphacode
        const [prevalenceEntries, inheritanceTypes] = await Promise.all([
          fetchEpidemiology(orphacode),
          fetchNaturalHistory(orphacode),
        ]);

        // Check AR inheritance using exact match (not string parsing per CONTEXT.md)
        const isAutosomalRecessive = inheritanceTypes.includes(
          "Autosomal recessive",
        );

        // Select best prevalence entry and parse ValMoy to number
        const bestEntry = selectBestPrevalence(prevalenceEntries);
        const bestPrevalence = bestEntry
          ? {
              prevalenceClass: bestEntry.PrevalenceClass,
              geographic: bestEntry.PrevalenceGeographic,
              validationStatus: bestEntry.PrevalenceValidationStatus,
              valMoy: parseFloat(bestEntry.ValMoy) || 0,
            }
          : null;

        return {
          orphacode,
          name,
          orphanetUrl,
          isAutosomalRecessive,
          bestPrevalence,
        };
      }),
    );

    // Collect successful enrichments; filter out diseases with no name (safety check)
    const diseases: OrphanetDisease[] = enrichedResults
      .filter(
        (r): r is PromiseFulfilledResult<OrphanetDisease> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value)
      .filter((d) => Boolean(d.name));

    return {
      geneSymbol,
      diseases,
      fetchedAt: Date.now(),
      error: null,
    };
  } catch (err) {
    return {
      geneSymbol,
      diseases: [],
      fetchedAt: Date.now(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
