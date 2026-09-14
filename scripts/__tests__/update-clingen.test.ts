import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateClinGenCsv, parseCsvLine, EXPECTED_HEADERS } from '../update-clingen-gene-validity';

describe('ClinGen Data Integrity Validator (PLAN-14, SPEC-09, NEW-13)', () => {
  it('validates the currently shipped production CSV file', () => {
    const shippedPath = resolve(process.cwd(), 'apps/web/public/data/clingen-gene-validity.csv');
    const content = readFileSync(shippedPath, 'utf8');

    const result = validateClinGenCsv(content);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.curationCount).toBeGreaterThanOrEqual(1000);
    expect(result.headers).toEqual(EXPECTED_HEADERS);
  });

  it('rejects empty input', () => {
    const result = validateClinGenCsv('');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/empty/i);
  });

  it('rejects HTML error responses', () => {
    const html = '<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>';
    const result = validateClinGenCsv(html);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/HTML/i);
  });

  it('rejects CSV with malformed header column names', () => {
    const malformed = [
      '"PREAMBLE 1"',
      '"PREAMBLE 2"',
      '"PREAMBLE 3"',
      '"+++++++"',
      '"WRONG_HEADER","GENE ID (HGNC)","DISEASE LABEL","DISEASE ID (MONDO)","MOI","SOP","CLASSIFICATION","ONLINE REPORT","CLASSIFICATION DATE","GCEP"',
      ...Array.from({ length: 1100 }, (_, i) => `"GENE${i}","HGNC:${i}","Disease","MONDO:0001","AD","SOP10","Definitive","http","date","GCEP"`),
    ].join('\n');

    const result = validateClinGenCsv(malformed);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Header mismatch/i);
  });

  it('rejects truncated CSV with fewer than 1,000 curation rows', () => {
    const truncated = [
      '"PREAMBLE 1"',
      '"PREAMBLE 2"',
      '"PREAMBLE 3"',
      '"+++++++"',
      EXPECTED_HEADERS.map((h) => `"${h}"`).join(','),
      '"+++++++"',
      ...Array.from({ length: 50 }, (_, i) => `"GENE${i}","HGNC:${i}","Disease","MONDO:0001","AD","SOP10","Definitive","http","date","GCEP"`),
    ].join('\n');

    const result = validateClinGenCsv(truncated);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/fewer than 1,000|only \d+ lines|Insufficient/i);
  });

  it('correctly skips separator row and does not count it as a curation', () => {
    const curations = Array.from({ length: 1005 }, (_, i) => `"GENE${i}","HGNC:${i}","Disease","MONDO:0001","AD","SOP10","Definitive","http","date","GCEP"`);
    const validWithSep = [
      '"PREAMBLE 1"',
      '"PREAMBLE 2"',
      '"PREAMBLE 3"',
      '"+++++++"',
      EXPECTED_HEADERS.map((h) => `"${h}"`).join(','),
      '"+++++++"', // separator row
      ...curations,
    ].join('\n');

    const result = validateClinGenCsv(validWithSep);
    expect(result.valid).toBe(true);
    expect(result.curationCount).toBe(1005);
  });

  it('parses CSV lines with commas inside quotes properly', () => {
    const line = '"ABCA3","HGNC:33","interstitial lung disease due to ABCA3 deficiency, severe","MONDO:0012582"';
    const fields = parseCsvLine(line).map((f) => f.replace(/^"|"$/g, ''));
    expect(fields[0]).toBe('ABCA3');
    expect(fields[1]).toBe('HGNC:33');
    expect(fields[2]).toBe('interstitial lung disease due to ABCA3 deficiency, severe');
    expect(fields[3]).toBe('MONDO:0012582');
  });
});
