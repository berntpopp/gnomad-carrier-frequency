// Publication-ready chart export composable
// Provides SVG and PNG download for PopulationBarChart
// Uses clone + XMLSerializer pattern to avoid mutating the live DOM

import { generateFilename } from "@/utils/export-utils";

// ── Publication color constants ────────────────────────────────────────────────
// Must match CHART_COLORS.publication in PopulationBarChart (colorblind-safe)

const PUB_COLORS = {
  background: "#FFFFFF",
  text: "#1A1A1A",
  refLine: "#666666",
  normalBar: "#0072B2",
  founderBar: "#D55E00",
} as const;

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// ── Publication color replacement ─────────────────────────────────────────────

/**
 * Walk all elements in a cloned SVG and replace CSS variable-based
 * fills/strokes with literal hex values for standalone SVG export.
 *
 * Does NOT mutate the original SVG element.
 */
function applyPublicationColors(svgEl: SVGSVGElement): void {
  // Force root background to white
  svgEl.style.background = PUB_COLORS.background;

  for (const el of Array.from(svgEl.querySelectorAll("*"))) {
    const fill = el.getAttribute("fill");
    const stroke = el.getAttribute("stroke");

    if (fill) {
      if (
        fill.includes("var(--v-theme-surface)") ||
        fill.includes("rgb(var(")
      ) {
        // Background rect uses surface color — force to white
        if (
          fill.includes("var(--v-theme-surface)") &&
          !fill.includes("on-surface")
        ) {
          el.setAttribute("fill", PUB_COLORS.background);
        } else {
          // on-surface or other text fills — force to dark
          el.setAttribute("fill", PUB_COLORS.text);
        }
      }
    }

    if (stroke) {
      if (stroke === "currentColor" || stroke.includes("currentColor")) {
        // Reference line uses currentColor — replace with publication ref line color
        el.setAttribute("stroke", PUB_COLORS.refLine);
      }
    }

    // Also handle text elements that use fill="currentColor" (implicit)
    if (el.tagName === "text" || el.tagName === "tspan") {
      const textFill = el.getAttribute("fill");
      if (!textFill || textFill === "currentColor") {
        el.setAttribute("fill", PUB_COLORS.text);
      }
    }
  }
}

// ── Publication metadata (title + footer) ─────────────────────────────────────

/**
 * Add title and footer to a cloned SVG for publication export.
 * Expands the viewBox to accommodate the extra space.
 *
 * Does NOT mutate the original SVG element.
 */
function addPublicationMetadata(
  svgEl: SVGSVGElement,
  gene: string,
  gnomadVersion: string,
): void {
  const TITLE_SPACE = 30; // px above chart for title
  const FOOTER_SPACE = 20; // px below chart for footer

  // Set required xmlns for standalone SVG
  svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  // Parse existing viewBox
  const viewBoxAttr = svgEl.getAttribute("viewBox") ?? "0 0 600 400";
  const [vbX, vbY, vbWidth, vbHeight] = viewBoxAttr
    .split(/\s+/)
    .map(Number) as [number, number, number, number];

  const newHeight = vbHeight + TITLE_SPACE + FOOTER_SPACE;

  // Update viewBox to new height
  svgEl.setAttribute("viewBox", `${vbX} ${vbY} ${vbWidth} ${newHeight}`);

  // Wrap all existing content in a group shifted down by TITLE_SPACE
  const contentGroup = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  contentGroup.setAttribute("transform", `translate(0, ${TITLE_SPACE})`);

  // Move all existing children into the group
  while (svgEl.firstChild) {
    contentGroup.appendChild(svgEl.firstChild);
  }
  svgEl.appendChild(contentGroup);

  // Insert title text
  const titleEl = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  titleEl.setAttribute("x", "8");
  titleEl.setAttribute("y", "20");
  titleEl.setAttribute("font-size", "14");
  titleEl.setAttribute("font-weight", "bold");
  titleEl.setAttribute("fill", PUB_COLORS.text);
  titleEl.setAttribute("font-family", FONT_FAMILY);
  titleEl.textContent = `${gene} \u2014 Carrier Frequency by Population`;
  svgEl.insertBefore(titleEl, contentGroup);

  // Insert footer text
  const footerEl = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  footerEl.setAttribute("x", "8");
  footerEl.setAttribute("y", String(newHeight - 6));
  footerEl.setAttribute("font-size", "9");
  footerEl.setAttribute("fill", PUB_COLORS.refLine);
  footerEl.setAttribute("font-family", FONT_FAMILY);
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  footerEl.textContent = `Source: gnomAD ${gnomadVersion}   Generated: ${today}`;
  svgEl.appendChild(footerEl);
}

// ── Download helpers ──────────────────────────────────────────────────────────

function triggerDownload(url: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Download the chart as a publication-ready SVG file.
 * Clones the SVG, applies publication colors, adds title/footer metadata,
 * and triggers a browser download.
 */
function downloadSvg(
  svgEl: SVGSVGElement,
  gene: string,
  gnomadVersion: string,
): void {
  // 1. Clone to avoid mutating live DOM
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  // 2. Apply publication colors (resolve CSS variables)
  applyPublicationColors(clone);

  // 3. Add title + footer metadata
  addPublicationMetadata(clone, gene, gnomadVersion);

  // 4. Serialize to string
  const svgStr = new XMLSerializer().serializeToString(clone);
  const fullSvg = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgStr;

  // 5. Create blob and trigger download
  const blob = new Blob([fullSvg], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const filename = generateFilename(gene) + "_chart.svg";
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

/**
 * Download the chart as a PNG at 2x retina resolution.
 * Clones the SVG, applies publication colors, rasterizes via canvas,
 * and triggers a browser download.
 */
function downloadPng(
  svgEl: SVGSVGElement,
  gene: string,
  gnomadVersion: string,
  scale = 2,
): void {
  // 1. Clone and apply publication treatment
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  applyPublicationColors(clone);
  addPublicationMetadata(clone, gene, gnomadVersion);

  // 2. Get dimensions from the updated viewBox
  const viewBoxAttr = clone.getAttribute("viewBox") ?? "0 0 600 400";
  const parts = viewBoxAttr.split(/\s+/).map(Number);
  const width = parts[2] ?? 600;
  const height = parts[3] ?? 400;

  // 3. Serialize SVG to blob URL
  const svgStr = new XMLSerializer().serializeToString(clone);
  const fullSvg = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgStr;
  const blob = new Blob([fullSvg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(blob);

  // 4. Create canvas and draw at retina scale
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(svgUrl);
    return;
  }

  // 5. Attach onload BEFORE setting src (Pitfall 5)
  const img = new Image();
  img.onload = () => {
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(svgUrl);

    const pngUrl = canvas.toDataURL("image/png");
    const filename = generateFilename(gene) + "_chart.png";
    triggerDownload(pngUrl, filename);
  };
  img.src = svgUrl;
}

// ── Composable ────────────────────────────────────────────────────────────────

export interface UseChartExportReturn {
  downloadSvg: (
    svgEl: SVGSVGElement,
    gene: string,
    gnomadVersion: string,
  ) => void;
  downloadPng: (
    svgEl: SVGSVGElement,
    gene: string,
    gnomadVersion: string,
    scale?: number,
  ) => void;
}

export function useChartExport(): UseChartExportReturn {
  return { downloadSvg, downloadPng };
}
