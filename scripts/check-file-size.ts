/**
 * File Size Checker: Enforces strict < 650 LOC limit on all tracked source files
 * per AGENTS.md guidelines.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const MAX_LOC = 650;

export function checkFileSizes(): { violations: { file: string; lines: number }[]; totalChecked: number } {
  // Get tracked files from git
  const stdout = execSync('git ls-files "*.ts" "*.vue"', { encoding: 'utf8' });
  const files = stdout
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f.length > 0)
    .filter((f) => {
      // Exclude tests, mocks, declaration files, and configs
      if (f.includes('__tests__') || f.includes('.test.ts') || f.includes('.spec.ts')) return false;
      if (f.endsWith('.d.ts')) return false;
      if (f.includes('test/setup.ts') || f.includes('test/mocks/')) return false;
      return true;
    });

  const violations: { file: string; lines: number }[] = [];

  for (const file of files) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    if (lines >= MAX_LOC) {
      violations.push({ file, lines });
    }
  }

  return { violations, totalChecked: files.length };
}

if (import.meta.main) {
  console.log(`Checking file sizes (strict limit: < ${MAX_LOC} LOC)...`);
  const { violations, totalChecked } = checkFileSizes();

  console.log(`Checked ${totalChecked} tracked source files.`);

  if (violations.length > 0) {
    console.error(`\nFound ${violations.length} files violating the < ${MAX_LOC} LOC limit:`);
    for (const v of violations) {
      console.error(`  - ${v.file}: ${v.lines} lines (exceeds limit of ${MAX_LOC})`);
    }
    process.exit(1);
  } else {
    console.log(`All ${totalChecked} source files are strictly under ${MAX_LOC} LOC. Passed!`);
    process.exit(0);
  }
}
