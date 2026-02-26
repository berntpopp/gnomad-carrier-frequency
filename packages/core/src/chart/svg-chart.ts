// Pure SVG chart generator — no DOM dependency, produces SVG markup as a string.
// Used by CLI for `--format svg` output and potentially by web for server-side rendering.

import type { PopulationFrequency } from "../types/index.js";
import { frequencyToPercent } from "../calculations/formatters.js";

export interface SvgChartOptions {
  /** Gene symbol for title */
  gene: string;
  /** gnomAD version string for footer (e.g. "gnomAD v4.1.0") */
  gnomadVersion: string;
  /** Global carrier frequency for reference line */
  globalCarrierFrequency: number | null;
  /** Format function for frequency values. Defaults to percent. */
  formatFrequency?: (freq: number | null) => string;
  /** Include title and footer metadata (default: true) */
  includeMetadata?: boolean;
}

// Layout constants (match web PopulationBarChart.vue)
const SVG_WIDTH = 600;
const LABEL_WIDTH = 160;
const VALUE_MARGIN = 90;
const VALUE_MARGIN_GAP = 6;
const BAR_HEIGHT = 20;
const BAR_GAP = 8;
const TOP_PADDING = 24;
const BOTTOM_PADDING = 40;
const BAR_AREA = SVG_WIDTH - LABEL_WIDTH - VALUE_MARGIN;

// Publication colors (Okabe-Ito, colorblind-safe)
const COLORS = {
  background: "#FFFFFF",
  text: "#1A1A1A",
  normalBar: "#0072B2",
  founderBar: "#D55E00",
  refLine: "#666666",
  refLineLabel: "#666666",
};

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate a publication-ready SVG bar chart from population frequency data.
 * Returns a complete SVG document as a string (no DOM required).
 */
export function generateSvgChart(
  populations: PopulationFrequency[],
  options: SvgChartOptions,
): string {
  const formatFn = options.formatFrequency ?? frequencyToPercent;
  const includeMetadata = options.includeMetadata !== false;

  // Filter and sort: only non-zero populations, descending by frequency
  const visiblePops = populations
    .filter((p) => p.carrierFrequency !== null && p.carrierFrequency > 0)
    .sort((a, b) => (b.carrierFrequency ?? 0) - (a.carrierFrequency ?? 0));

  if (visiblePops.length === 0) {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} 80" width="${SVG_WIDTH}" height="80">`,
      `  <rect width="100%" height="100%" fill="${COLORS.background}"/>`,
      `  <text x="${SVG_WIDTH / 2}" y="44" text-anchor="middle" font-size="13" fill="${COLORS.text}" font-family="${FONT_FAMILY}">No population data available</text>`,
      "</svg>",
    ].join("\n");
  }

  const maxFreq = Math.max(
    options.globalCarrierFrequency ?? 0,
    ...visiblePops.map((p) => p.carrierFrequency ?? 0),
  );

  function barWidth(freq: number | null): number {
    if (!freq || !maxFreq) return 0;
    return (freq / maxFreq) * BAR_AREA;
  }

  function barY(index: number): number {
    return TOP_PADDING + index * (BAR_HEIGHT + BAR_GAP);
  }

  // Compute chart dimensions
  const chartHeight =
    TOP_PADDING +
    visiblePops.length * (BAR_HEIGHT + BAR_GAP) +
    BOTTOM_PADDING;

  const metaTopSpace = includeMetadata ? 30 : 0;
  const metaBottomSpace = includeMetadata ? 20 : 0;
  const totalHeight = chartHeight + metaTopSpace + metaBottomSpace;

  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${totalHeight}" width="${SVG_WIDTH}" height="${totalHeight}">`,
  );

  // Background
  lines.push(
    `  <rect width="100%" height="100%" fill="${COLORS.background}"/>`,
  );

  // Title (if metadata enabled)
  if (includeMetadata) {
    lines.push(
      `  <text x="8" y="20" font-size="14" font-weight="bold" fill="${COLORS.text}" font-family="${FONT_FAMILY}">${escapeXml(options.gene)} — Carrier Frequency by Population</text>`,
    );
  }

  // Chart content group (shifted down by metadata space)
  lines.push(`  <g transform="translate(0, ${metaTopSpace})">`);

  // Population rows
  for (let i = 0; i < visiblePops.length; i++) {
    const pop = visiblePops[i];
    const y = barY(i);
    const w = barWidth(pop.carrierFrequency);
    const fill = pop.isFounderEffect ? COLORS.founderBar : COLORS.normalBar;
    const label = escapeXml(pop.label);
    const value = escapeXml(formatFn(pop.carrierFrequency));

    // Population label
    lines.push(
      `    <text x="${LABEL_WIDTH - 8}" y="${y + BAR_HEIGHT / 2 + 4}" font-size="12" text-anchor="end" fill="${COLORS.text}" font-family="${FONT_FAMILY}">${label}</text>`,
    );

    // Bar
    lines.push(
      `    <rect x="${LABEL_WIDTH}" y="${y}" width="${w.toFixed(1)}" height="${BAR_HEIGHT}" fill="${fill}" rx="2"/>`,
    );

    // Value label
    lines.push(
      `    <text x="${(LABEL_WIDTH + w + VALUE_MARGIN_GAP).toFixed(1)}" y="${y + BAR_HEIGHT / 2 + 4}" font-size="11" text-anchor="start" fill="${COLORS.text}" font-family="${FONT_FAMILY}">${value}</text>`,
    );
  }

  // Global reference line
  if (
    options.globalCarrierFrequency !== null &&
    options.globalCarrierFrequency > 0 &&
    maxFreq > 0
  ) {
    const refX =
      LABEL_WIDTH + (options.globalCarrierFrequency / maxFreq) * BAR_AREA;
    const refLabel = escapeXml(
      `Global: ${formatFn(options.globalCarrierFrequency)}`,
    );

    lines.push(
      `    <line x1="${refX.toFixed(1)}" x2="${refX.toFixed(1)}" y1="${TOP_PADDING - 4}" y2="${chartHeight - BOTTOM_PADDING + 4}" stroke="${COLORS.refLine}" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6"/>`,
    );
    lines.push(
      `    <text x="${(refX + 4).toFixed(1)}" y="${TOP_PADDING - 8}" font-size="10" text-anchor="start" fill="${COLORS.refLineLabel}" font-family="${FONT_FAMILY}">${refLabel}</text>`,
    );
  }

  lines.push("  </g>");

  // Footer (if metadata enabled)
  if (includeMetadata) {
    const date = new Date().toISOString().slice(0, 10);
    lines.push(
      `  <text x="8" y="${totalHeight - 6}" font-size="9" fill="${COLORS.refLineLabel}" font-family="${FONT_FAMILY}">Source: ${escapeXml(options.gnomadVersion)}   Generated: ${date}</text>`,
    );
  }

  lines.push("</svg>");

  return lines.join("\n");
}
