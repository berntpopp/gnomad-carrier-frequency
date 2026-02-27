/**
 * gnomad-cf query <gene>
 *
 * Single-gene carrier frequency lookup command.
 * Fetches variants from gnomAD, filters to pathogenic, aggregates frequencies,
 * and outputs results in the requested format (text | json | tsv).
 *
 * CLI requirements addressed:
 *   CLI-02: Single gene lookup
 *   CLI-04: Output formats (text, json, tsv, svg)
 *   CLI-05: Clinical text generation
 *   CLI-06: Population filter
 *   CLI-07: Variant filter flags (LoF, ClinVar, star threshold)
 *   CLI-08: Homozygote exclusion flag
 *   CLI-09: Output to file
 *   CLI-13: Gene config stub (Phase 28 feature — deferred)
 */

import { Command } from "commander";
import { writeFile } from "node:fs/promises";
import { loadUserConfig, mergeConfig } from "../config/user-config.js";
import { queryGene } from "../utils/gene-query.js";
import { resolvePopulation } from "../utils/population-aliases.js";
import { formatText } from "../output/text-formatter.js";
import { formatJson } from "../output/json-formatter.js";
import { formatTsv } from "../output/tsv-formatter.js";
import { formatClinical } from "../output/clinical-formatter.js";
import { formatSvg } from "../output/svg-formatter.js";
import { fetchOrphanetData } from "@gnomad-cf/core/orphanet";

export const queryCommand = new Command("query")
  .description("Query gnomAD carrier frequency for a single gene")
  .argument("<gene>", "Gene symbol (e.g. CFTR, HEXA) — case-insensitive")
  // ── Population filter ────────────────────────────────────────────────────
  .option(
    "-p, --population <id>",
    "Filter to a specific population (e.g. nfe, european, east-asian)",
  )
  // ── Output format ────────────────────────────────────────────────────────
  .option("-f, --format <fmt>", "Output format: text | json | tsv | svg", "text")
  // ── Variant breakdown ─────────────────────────────────────────────────────
  .option("--variants", "Include per-variant breakdown in output", false)
  // ── Clinical text ─────────────────────────────────────────────────────────
  .option("--text", "Append clinical documentation text to output", false)
  .option(
    "--clinical",
    "Alias for --text (append clinical documentation text)",
    false,
  )
  .option("--language <lang>", "Language for clinical text: de | en", "de")
  // ── gnomAD version ────────────────────────────────────────────────────────
  .option(
    "--gnomad-version <ver>",
    "gnomAD version: v4 | v3 | v2 (default: from user config or v4)",
  )
  // ── HWE formula ───────────────────────────────────────────────────────────
  .option("--hwe", "Use HWE formula for carrier frequency (default: true)")
  .option("--no-hwe", "Use simplified 2q formula instead of HWE")
  // ── Homozygote exclusion ──────────────────────────────────────────────────
  .option("--exclude-homozygotes", "Apply homozygote exclusion (default: true)")
  .option("--no-exclude-homozygotes", "Disable homozygote exclusion")
  // ── Penetrance ────────────────────────────────────────────────────────────
  .option(
    "--penetrance <n>",
    "Penetrance fraction 0–1 for Bayesian prevalence (default: 1.0)",
    parseFloat,
    1.0,
  )
  // ── Output file ───────────────────────────────────────────────────────────
  .option("-o, --output <path>", "Write output to file instead of stdout")
  // ── Variant filter flags ──────────────────────────────────────────────────
  .option("--lof", "Include LoF high-confidence variants (default: true)")
  .option("--no-lof", "Exclude LoF high-confidence variants")
  .option(
    "--clinvar",
    "Include ClinVar pathogenic/likely-pathogenic variants (default: true)",
  )
  .option(
    "--no-clinvar",
    "Exclude ClinVar pathogenic/likely-pathogenic variants",
  )
  .option(
    "--star-threshold <n>",
    "Minimum ClinVar review star rating to include (default: 2)",
    parseInt,
    2,
  )
  // ── Gene config stub (CLI-13, full implementation in Phase 28) ────────────
  .option(
    "--config <gene>",
    "Apply community-curated gene config (STUB: available in a future version)",
  )
  .action(async (gene: string, opts: Record<string, unknown>) => {
    try {
      // CLI-13 stub: --config flag prints deferral note and continues normally
      if (opts["config"]) {
        process.stderr.write(
          `Note: Gene configs (--config) will be available in a future version. Proceeding with default settings.\n`,
        );
      }

      // Load user config and merge with CLI flags
      const userConfig = await loadUserConfig();

      // Pass gnomadVersion as 'version' so mergeConfig picks it up
      const flagsForMerge = {
        ...opts,
        version: opts["gnomadVersion"],
      };
      const merged = mergeConfig(userConfig, flagsForMerge);

      // Resolve population alias if provided
      const pop =
        typeof opts["population"] === "string"
          ? resolvePopulation(opts["population"])
          : undefined;

      // Build filter config overrides from explicit flags
      // Commander sets boolean negatable flags: --lof -> true, --no-lof -> false
      const filterConfig = { ...merged.filterConfig };
      if (typeof opts["lof"] === "boolean") {
        filterConfig.lofHcEnabled = opts["lof"];
      }
      if (typeof opts["clinvar"] === "boolean") {
        filterConfig.clinvarEnabled = opts["clinvar"];
      }
      if (typeof opts["starThreshold"] === "number") {
        filterConfig.clinvarStarThreshold = opts["starThreshold"];
      }

      // Query gnomAD
      const result = await queryGene(gene, {
        version: merged.version,
        filterConfig,
        calcConfig: merged.calcConfig,
        population: pop,
      });

      // Fetch Orphanet data (non-blocking -- failure is OK)
      try {
        const orphanetResult = await fetchOrphanetData(gene);
        if (orphanetResult.diseases.length > 0 && !orphanetResult.error) {
          result.orphanetDiseases = orphanetResult.diseases;
        }
      } catch {
        // Silently skip Orphanet data on failure
      }

      // Format main output
      let output: string;

      const format = merged.format;
      if (format === "svg") {
        output = formatSvg(result);
      } else if (format === "json") {
        output = formatJson(result, {
          includeVariants: opts["variants"] === true,
          pretty: true,
        });
      } else if (format === "tsv") {
        output = formatTsv(result, {
          includeVariants: opts["variants"] === true,
        });
      } else {
        // Default: text
        output = formatText(result, {
          includeVariants: opts["variants"] === true,
        });
      }

      // Append clinical text if --text or --clinical flag set
      if (opts["text"] === true || opts["clinical"] === true) {
        const language =
          typeof opts["language"] === "string" ? opts["language"] : "de";
        const clinicalText = await formatClinical(result, {
          language: language as "de" | "en",
        });
        output = output + "\n\n" + clinicalText;
      }

      // Write output to file or stdout
      if (typeof opts["output"] === "string") {
        await writeFile(opts["output"], output + "\n", "utf-8");
      } else {
        process.stdout.write(output + "\n");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      // Provide helpful context based on error type
      if (message.includes("not found in gnomAD")) {
        process.stderr.write(
          `Error: ${message}\n` +
            `Tip: Check spelling — gene symbols are case-insensitive (e.g. CFTR, Cftr, cftr all work).\n`,
        );
      } else if (
        message.includes("fetch failed") ||
        message.includes("ENOTFOUND") ||
        message.includes("ECONNREFUSED") ||
        message.includes("network")
      ) {
        process.stderr.write(
          `Error: Network request failed — ${message}\n` +
            `Tip: Check your internet connection and try again.\n`,
        );
      } else if (message.includes("gnomAD API error")) {
        process.stderr.write(
          `Error: gnomAD server returned an error:\n  ${message}\n`,
        );
      } else {
        process.stderr.write(`Error: ${message}\n`);
      }

      process.exit(1);
    }
  });
