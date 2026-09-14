/**
 * Docs Asset Checker: Verifies no missing preloads (e.g. .lean.js 404s)
 * in VitePress documentation build.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

export function checkDocsAssets(docsDistPath: string): { missingAssets: string[]; totalChecked: number } {
  if (!existsSync(docsDistPath)) {
    return { missingAssets: [`Docs directory not found: ${docsDistPath}`], totalChecked: 0 };
  }

  const htmlFiles: string[] = [];

  function collectHtmlFiles(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        collectHtmlFiles(fullPath);
      } else if (entry.name.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  }

  collectHtmlFiles(docsDistPath);

  const missingAssets: string[] = [];
  let totalChecked = 0;

  const preloadRegex = /<(?:link[^>]+rel=["'](?:module)?preload["'][^>]+href=["']([^"']+)["']|script[^>]+src=["']([^"']+)["'])/gi;

  for (const htmlFile of htmlFiles) {
    const content = readFileSync(htmlFile, 'utf8');
    let match: RegExpExecArray | null;

    while ((match = preloadRegex.exec(content)) !== null) {
      const assetPath = match[1] || match[2];
      if (!assetPath || assetPath.startsWith('http:') || assetPath.startsWith('https:') || assetPath.startsWith('//')) {
        continue;
      }

      totalChecked++;
      // Clean asset path (strip query params/hashes and leading slashes/base)
      const cleanPath = assetPath.split('?')[0].split('#')[0].replace(/^\/docs\//, '/').replace(/^\//, '');
      const expectedFile = resolve(docsDistPath, cleanPath);

      if (!existsSync(expectedFile)) {
        missingAssets.push(`Referenced asset not found: ${assetPath} in ${htmlFile}`);
      }
    }
  }

  return { missingAssets, totalChecked };
}

if (import.meta.main) {
  const distDir = resolve(process.cwd(), 'apps/web/docs/.vitepress/dist');
  console.log(`Checking documentation preloaded assets in ${distDir}...`);

  const { missingAssets, totalChecked } = checkDocsAssets(distDir);
  console.log(`Checked ${totalChecked} asset references across documentation.`);

  if (missingAssets.length > 0) {
    console.error(`\nFound ${missingAssets.length} missing asset references:`);
    for (const missing of missingAssets) {
      console.error(`  - ${missing}`);
    }
    process.exit(1);
  } else {
    console.log('All preloaded documentation assets exist on disk. Passed!');
    process.exit(0);
  }
}
