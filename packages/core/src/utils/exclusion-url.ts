// URL compression utilities for excluded variant IDs
import LZString from 'lz-string';

/** Maximum compressed exclusion string length for URL safety */
const MAX_EXCLUSION_URL_LENGTH = 1500; // Conservative limit within 2000 char URL

/**
 * Encode excluded variant IDs for URL parameter
 * Uses lz-string compression for efficient encoding
 *
 * @param variantIds - Array of variant IDs to encode
 * @returns Compressed string or null if too long for URL
 */
export function encodeExclusions(variantIds: string[]): string | null {
  if (variantIds.length === 0) return null;

  // Join IDs with comma separator
  const joined = variantIds.join(',');

  // Compress using URL-safe encoding
  const compressed = LZString.compressToEncodedURIComponent(joined);

  // Check if result fits in URL
  if (compressed.length > MAX_EXCLUSION_URL_LENGTH) {
    console.warn(
      `[Exclusion URL] Compressed exclusions (${compressed.length} chars) exceed limit (${MAX_EXCLUSION_URL_LENGTH}). Exclusions will not be included in URL.`
    );
    return null;
  }

  return compressed;
}

/**
 * Decode excluded variant IDs from URL parameter
 *
 * @param compressed - Compressed string from URL
 * @returns Array of variant IDs, empty array if invalid
 */
export function decodeExclusions(compressed: string): string[] {
  if (!compressed) return [];

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    if (!decompressed) {
      console.warn('[Exclusion URL] Failed to decompress exclusion data');
      return [];
    }
    return decompressed.split(',').filter(Boolean);
  } catch (error) {
    console.warn('[Exclusion URL] Error decoding exclusions:', error);
    return [];
  }
}

/**
 * Check if exclusion list is too large for URL sharing
 *
 * @param variantIds - Array of variant IDs
 * @returns true if exclusions would not fit in URL
 */
export function exclusionsTooLargeForUrl(variantIds: string[]): boolean {
  if (variantIds.length === 0) return false;

  const joined = variantIds.join(',');
  const compressed = LZString.compressToEncodedURIComponent(joined);
  return compressed.length > MAX_EXCLUSION_URL_LENGTH;
}
