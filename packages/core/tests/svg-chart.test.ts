import { describe, it, expect } from "vitest";
import { generateSvgChart } from "../src/chart/svg-chart.js";
import type { PopulationFrequency } from "../src/types/frequency.js";

describe("generateSvgChart", () => {
  const populations: PopulationFrequency[] = [
    {
      code: "nfe",
      label: "European (non-Finnish)",
      carrierFrequency: 0.04,
      alleleCount: 40,
      alleleNumber: 1000,
      isLowSampleSize: false,
      isFounderEffect: false,
      geneticPrevalence: 0.0004,
    },
    {
      code: "asj",
      label: "Ashkenazi Jewish",
      carrierFrequency: 0.08,
      alleleCount: 16,
      alleleNumber: 200,
      isLowSampleSize: false,
      isFounderEffect: true,
      geneticPrevalence: 0.0016,
    },
  ];

  it("generates valid SVG markup string containing expected elements", () => {
    const svg = generateSvgChart(populations, {
      gene: "CFTR",
      gnomadVersion: "gnomAD v4.1.0",
      globalCarrierFrequency: 0.04,
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("CFTR");
    expect(svg).toContain("European (non-Finnish)");
    expect(svg).toContain("Ashkenazi Jewish");
    expect(svg).toContain("gnomAD v4.1.0");
    // Founder effect color
    expect(svg).toContain("#D55E00");
  });

  it("handles empty populations without crashing", () => {
    const svg = generateSvgChart([], {
      gene: "TEST",
      gnomadVersion: "gnomAD v4",
      globalCarrierFrequency: null,
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("No population data available");
  });

  it("supports omitting metadata (title/footer)", () => {
    const svg = generateSvgChart(populations, {
      gene: "CFTR",
      gnomadVersion: "gnomAD v4.1.0",
      globalCarrierFrequency: 0.04,
      includeMetadata: false,
    });
    expect(svg).not.toContain("gnomAD v4.1.0");
  });
});
