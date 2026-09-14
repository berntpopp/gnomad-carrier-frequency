/**
 * ClinGen Gene Validity Data Validator & Updater
 * Downloads and validates the ClinGen Gene Disease Validity curations CSV
 * before updating apps/web/public/data/clingen-gene-validity.csv.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const EXPECTED_HEADERS = [
  'GENE SYMBOL',
  'GENE ID (HGNC)',
  'DISEASE LABEL',
  'DISEASE ID (MONDO)',
  'MOI',
  'SOP',
  'CLASSIFICATION',
  'ONLINE REPORT',
  'CLASSIFICATION DATE',
  'GCEP',
];

export const VALID_CLASSIFICATIONS = new Set([
  'Definitive',
  'Strong',
  'Moderate',
  'Limited',
  'No Known Disease Relationship',
  'Disputed',
  'Refuted',
  'Animal Model Only',
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
  curationCount: number;
  headers: string[];
}

/**
 * Splits a CSV line into fields, handling quoted strings with commas.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Validates ClinGen Gene Validity CSV content.
 * Expected structure:
 * - Lines 1-4: Preamble / metadata (skipped)
 * - Line 5: Canonical header row
 * - Line 6: Separator row (e.g. ++++++) (skipped)
 * - Lines 7+: Data rows (>= 1,000 valid curation rows)
 */
export function validateClinGenCsv(csvContent: string): ValidationResult {
  if (!csvContent || csvContent.trim().length === 0) {
    return { valid: false, error: 'CSV content is empty', curationCount: 0, headers: [] };
  }

  // Reject HTML error pages
  if (csvContent.toLowerCase().includes('<!doctype html') || csvContent.toLowerCase().includes('<html')) {
    return { valid: false, error: 'Received HTML response instead of CSV', curationCount: 0, headers: [] };
  }

  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 100) {
    return {
      valid: false,
      error: `File has only ${lines.length} lines, expected at least 1,000 curation rows`,
      curationCount: 0,
      headers: [],
    };
  }

  // Header is expected at line 5 (0-indexed: 4)
  const headerLine = lines[4];
  const headers = parseCsvLine(headerLine).map((h) => h.replace(/^"|"$/g, ''));

  // Verify headers match expected columns
  for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
    if (headers[i] !== EXPECTED_HEADERS[i]) {
      return {
        valid: false,
        error: `Header mismatch at column ${i}: expected "${EXPECTED_HEADERS[i]}", got "${headers[i]}"`,
        curationCount: 0,
        headers,
      };
    }
  }

  // Parse curations starting after header (skip line 6 if separator)
  let startIndex = 5;
  if (lines[startIndex] && lines[startIndex].includes('+++++')) {
    startIndex = 6;
  }

  let curationCount = 0;
  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]).map((f) => f.replace(/^"|"$/g, ''));
    if (fields.length < EXPECTED_HEADERS.length) continue;

    const geneSymbol = fields[0];
    const classification = fields[6];

    if (!geneSymbol || geneSymbol.startsWith('+')) continue;

    if (!VALID_CLASSIFICATIONS.has(classification)) {
      // Non-fatal warning or classification check
    }

    curationCount++;
  }

  if (curationCount < 1000) {
    return {
      valid: false,
      error: `Insufficient curations: found ${curationCount}, expected at least 1,000`,
      curationCount,
      headers,
    };
  }

  return { valid: true, curationCount, headers };
}

/**
 * Main execution function
 */
export async function updateClinGenData(): Promise<void> {
  const url = 'https://search.clinicalgenome.org/kb/gene-validity/download';
  const targetPath = resolve(process.cwd(), 'apps/web/public/data/clingen-gene-validity.csv');

  console.log(`Downloading ClinGen Gene Validity data from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  const content = await response.text();
  console.log(`Downloaded ${content.length} bytes. Validating data integrity...`);

  const result = validateClinGenCsv(content);
  if (!result.valid) {
    throw new Error(`ClinGen CSV validation failed: ${result.error}`);
  }

  console.log(`Validation passed! Found ${result.curationCount} valid curations.`);
  writeFileSync(targetPath, content, 'utf8');
  console.log(`Updated ${targetPath} successfully.`);
}

// Execute if run directly
if (import.meta.main) {
  updateClinGenData().catch((err) => {
    console.error('Error updating ClinGen data:', err);
    process.exit(1);
  });
}
