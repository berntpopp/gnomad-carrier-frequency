/**
 * Load template content for a given language.
 * Reads the JSON template file from the core package's config/templates directory.
 * Works in both development (source) and built (dist) contexts within the monorepo.
 *
 * NOTE: Uses dynamic imports for node:fs/promises and node:path to avoid
 * breaking browser bundles. This function is CLI-only; the web app uses
 * static JSON imports via Vite instead.
 *
 * @param lang - Language code: 'de' for German, 'en' for English
 * @returns Parsed template JSON object
 */
export async function loadTemplateContent(
  lang: "de" | "en",
): Promise<Record<string, unknown>> {
  const { readFile } = await import("node:fs/promises");
  const { dirname, resolve } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const __dirname = dirname(fileURLToPath(import.meta.url));

  const candidatePaths = [
    // Built package output (packages/core/dist/templates/{lang}.json)
    resolve(__dirname, "templates", `${lang}.json`),
    // Source development path (packages/core/src/config/templates/{lang}.json)
    resolve(__dirname, "..", "config", "templates", `${lang}.json`),
    // Fallback if executed from dist relative to source tree
    resolve(
      __dirname,
      "..",
      "..",
      "src",
      "config",
      "templates",
      `${lang}.json`,
    ),
    // In case __dirname is packages/core
    resolve(__dirname, "dist", "templates", `${lang}.json`),
  ];

  for (const candidate of candidatePaths) {
    try {
      const raw = await readFile(candidate, "utf-8");
      return JSON.parse(raw);
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `Failed to load template for language "${lang}". Checked paths: ${candidatePaths.join(", ")}`,
  );
}
