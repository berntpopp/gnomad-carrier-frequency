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

  // Try src path first (development: __dirname = packages/core/src/templates)
  const srcPath = resolve(
    __dirname,
    "..",
    "config",
    "templates",
    `${lang}.json`,
  );
  try {
    const raw = await readFile(srcPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    // Fallback: try relative to built dist directory
    // (built: __dirname = packages/core/dist, src files still in packages/core/src)
    const distPath = resolve(
      __dirname,
      "..",
      "..",
      "src",
      "config",
      "templates",
      `${lang}.json`,
    );
    const raw = await readFile(distPath, "utf-8");
    return JSON.parse(raw);
  }
}
