import { describe, it, expect } from "vitest";
import type { GnomadVariant } from "../../types/index.js";
import type { QualitySettings, QualityExclusionConfig } from "../../types/index.js";
import { FACTORY_QUALITY_DEFAULTS, FACTORY_EXCLUSION_DEFAULTS } from "../../types/index.js";
import {
  isHighAF,
  isHighHom,
  isGnomadFiltered,
  isGenomesOnly,
  computeQualityFlags,
  shouldExcludeByQuality,
} from "../quality-flags.js";

// ─── Minimal variant factory helpers ────────────────────────────────────────

function makeJointVariant(
  ac: number,
  an: number,
  hom: number,
  populations?: Array<{ id: string; ac: number; an: number; homozygote_count: number }>,
): GnomadVariant {
  return {
    variant_id: "1-12345-A-G",
    pos: 12345,
    ref: "A",
    alt: "G",
    transcript_consequence: null,
    joint: {
      ac,
      an,
      homozygote_count: hom,
      hemizygote_count: 0,
      populations: populations ?? [],
    },
  };
}

function makeExomeGenomeVariant(
  exomeAc: number,
  exomeAn: number,
  exomeHom: number,
  genomeAc: number,
  genomeAn: number,
  genomeHom: number,
  exomeFilters?: string[],
  genomeFilters?: string[],
): GnomadVariant {
  return {
    variant_id: "1-12345-A-G",
    pos: 12345,
    ref: "A",
    alt: "G",
    transcript_consequence: null,
    exome: {
      ac: exomeAc,
      an: exomeAn,
      ac_hom: exomeHom,
      filters: exomeFilters,
      populations: [],
    },
    genome: {
      ac: genomeAc,
      an: genomeAn,
      ac_hom: genomeHom,
      filters: genomeFilters,
      populations: [],
    },
  };
}

function makeGenomeOnlyVariant(
  genomeAc: number,
  genomeAn: number,
  genomeHom: number,
  genomeFilters?: string[],
): GnomadVariant {
  return {
    variant_id: "1-12345-A-G",
    pos: 12345,
    ref: "A",
    alt: "G",
    transcript_consequence: null,
    genome: {
      ac: genomeAc,
      an: genomeAn,
      ac_hom: genomeHom,
      filters: genomeFilters,
      populations: [],
    },
  };
}

// ─── isHighAF tests ──────────────────────────────────────────────────────────

describe("isHighAF", () => {
  it("flags a variant with global AF exactly at threshold", () => {
    // AC=500, AN=10000 → AF=5%
    const variant = makeJointVariant(500, 10000, 0);
    expect(isHighAF(variant, 0.05)).toBe(true);
  });

  it("does not flag a variant with global AF just below threshold", () => {
    // AC=499, AN=10000 → AF=4.99%
    const variant = makeJointVariant(499, 10000, 0);
    expect(isHighAF(variant, 0.05)).toBe(false);
  });

  it("flags a variant when global AF is above threshold", () => {
    // AC=600, AN=10000 → AF=6%
    const variant = makeJointVariant(600, 10000, 0);
    expect(isHighAF(variant, 0.05)).toBe(true);
  });

  it("does not flag when AN=0 (no data)", () => {
    const variant = makeJointVariant(0, 0, 0);
    expect(isHighAF(variant, 0.05)).toBe(false);
  });

  it("flags a variant with low global AF but one population above threshold", () => {
    // Global AF=1% but AFR population at 6%
    const variant = makeJointVariant(100, 10000, 0, [
      { id: "nfe", ac: 10, an: 5000, homozygote_count: 0 },
      { id: "afr", ac: 300, an: 5000, homozygote_count: 0 }, // 6%
    ]);
    expect(isHighAF(variant, 0.05)).toBe(true);
  });

  it("does not flag when all populations are below threshold", () => {
    // Global AF=1%, all populations <= 3%
    const variant = makeJointVariant(100, 10000, 0, [
      { id: "nfe", ac: 15, an: 5000, homozygote_count: 0 }, // 0.3%
      { id: "afr", ac: 150, an: 5000, homozygote_count: 0 }, // 3%
    ]);
    expect(isHighAF(variant, 0.05)).toBe(false);
  });

  it("uses exome+genome fallback when no joint data", () => {
    // Exome AC=250, AN=5000 + Genome AC=250, AN=5000 → combined AF=5%
    const variant = makeExomeGenomeVariant(250, 5000, 0, 250, 5000, 0);
    expect(isHighAF(variant, 0.05)).toBe(true);
  });
});

// ─── isHighHom tests ─────────────────────────────────────────────────────────

describe("isHighHom", () => {
  describe("hwe_relative method", () => {
    const settings: QualitySettings = {
      ...FACTORY_QUALITY_DEFAULTS,
      highHomMethod: "hwe_relative",
      highHomHWEMultiplier: 5.0,
    };

    it("does not flag when observed hom equals expected hom (not over multiplier)", () => {
      // AF=0.01, AN=100000 → expected_hom = 0.01^2 * 100000 = 10
      // observed_hom = 10 → 10 > 50? No → not flagged
      const variant = makeJointVariant(1000, 100000, 10);
      expect(isHighHom(variant, settings)).toBe(false);
    });

    it("flags when observed hom exceeds multiplier × expected", () => {
      // AF=0.01, AN=100000 → expected_hom = 10
      // observed_hom = 60 → 60 > 50? Yes → flagged
      const variant = makeJointVariant(1000, 100000, 60);
      expect(isHighHom(variant, settings)).toBe(true);
    });

    it("does not flag when observed hom is exactly at multiplier × expected", () => {
      // AF=0.01, AN=100000 → expected_hom = 10
      // observed_hom = 50 → 50 > 50? No (strict greater than)
      const variant = makeJointVariant(1000, 100000, 50);
      expect(isHighHom(variant, settings)).toBe(false);
    });

    it("does not flag when AN=0", () => {
      const variant = makeJointVariant(0, 0, 0);
      expect(isHighHom(variant, settings)).toBe(false);
    });

    it("uses exome+genome fallback when no joint data", () => {
      // Exome: AC=500, AN=50000, hom=5; Genome: AC=500, AN=50000, hom=5
      // Combined: AC=1000, AN=100000, hom=10, AF=0.01, expected_hom=10 → not flagged
      const variant = makeExomeGenomeVariant(500, 50000, 5, 500, 50000, 5);
      expect(isHighHom(variant, settings)).toBe(false);
    });
  });

  describe("absolute method", () => {
    const settings: QualitySettings = {
      ...FACTORY_QUALITY_DEFAULTS,
      highHomMethod: "absolute",
      highHomAbsoluteThreshold: 10,
    };

    it("flags when hom_count >= absolute threshold", () => {
      const variant = makeJointVariant(100, 10000, 15);
      expect(isHighHom(variant, settings)).toBe(true);
    });

    it("flags when hom_count exactly equals absolute threshold", () => {
      const variant = makeJointVariant(100, 10000, 10);
      expect(isHighHom(variant, settings)).toBe(true);
    });

    it("does not flag when hom_count is below absolute threshold", () => {
      const variant = makeJointVariant(100, 10000, 5);
      expect(isHighHom(variant, settings)).toBe(false);
    });
  });
});

// ─── isGnomadFiltered tests ──────────────────────────────────────────────────

describe("isGnomadFiltered", () => {
  it("flags a variant with failing exome filters", () => {
    const variant = makeExomeGenomeVariant(10, 10000, 0, 0, 0, 0, ["RF"]);
    expect(isGnomadFiltered(variant)).toBe(true);
  });

  it("flags a variant with failing genome filters", () => {
    const variant = makeExomeGenomeVariant(0, 0, 0, 10, 10000, 0, undefined, ["AC0"]);
    expect(isGnomadFiltered(variant)).toBe(true);
  });

  it("flags a variant with multiple failing filters", () => {
    const variant = makeExomeGenomeVariant(10, 10000, 0, 0, 0, 0, ["RF", "InbreedingCoeff"]);
    expect(isGnomadFiltered(variant)).toBe(true);
  });

  it("does not flag a variant with empty filters array", () => {
    const variant = makeExomeGenomeVariant(10, 10000, 0, 0, 0, 0, []);
    expect(isGnomadFiltered(variant)).toBe(false);
  });

  it("does not flag a variant with PASS filter", () => {
    const variant = makeExomeGenomeVariant(10, 10000, 0, 0, 0, 0, ["PASS"]);
    expect(isGnomadFiltered(variant)).toBe(false);
  });

  it("does not flag a variant with undefined filters", () => {
    const variant = makeExomeGenomeVariant(10, 10000, 0, 0, 0, 0, undefined);
    expect(isGnomadFiltered(variant)).toBe(false);
  });

  it("does not flag a joint-only variant (no exome/genome fields)", () => {
    const variant = makeJointVariant(100, 10000, 0);
    expect(isGnomadFiltered(variant)).toBe(false);
  });

  it("flags a variant where both exome and genome have failing filters", () => {
    const variant = makeExomeGenomeVariant(10, 10000, 0, 10, 10000, 0, ["RF"], ["AC0"]);
    expect(isGnomadFiltered(variant)).toBe(true);
  });
});

// ─── isGenomesOnly tests ─────────────────────────────────────────────────────

describe("isGenomesOnly", () => {
  it("flags a variant with genome data but no exome", () => {
    const variant = makeGenomeOnlyVariant(100, 10000, 2);
    expect(isGenomesOnly(variant)).toBe(true);
  });

  it("does not flag a variant with both exome and genome data", () => {
    const variant = makeExomeGenomeVariant(50, 5000, 1, 50, 5000, 1);
    expect(isGenomesOnly(variant)).toBe(false);
  });

  it("does not flag a variant with joint data (joint = exome + genome combined)", () => {
    const variant = makeJointVariant(100, 10000, 0);
    expect(isGenomesOnly(variant)).toBe(false);
  });

  it("does not flag a variant with exome data but no genome", () => {
    const variant: GnomadVariant = {
      variant_id: "1-12345-A-G",
      pos: 12345,
      ref: "A",
      alt: "G",
      transcript_consequence: null,
      exome: { ac: 100, an: 10000, ac_hom: 2, populations: [] },
    };
    expect(isGenomesOnly(variant)).toBe(false);
  });

  it("does not flag a variant with genome present but AN=0", () => {
    const variant = makeGenomeOnlyVariant(0, 0, 0);
    expect(isGenomesOnly(variant)).toBe(false);
  });
});

// ─── computeQualityFlags tests ───────────────────────────────────────────────

describe("computeQualityFlags", () => {
  it("returns empty array for a clean variant with no issues", () => {
    // AF=0.001, small hom count, no filters
    const variant = makeJointVariant(100, 100000, 0);
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    expect(flags).toHaveLength(0);
  });

  it("returns high_af flag for a high-frequency variant", () => {
    // AF=6%
    const variant = makeJointVariant(600, 10000, 0);
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    expect(flags).toHaveLength(1);
    expect(flags[0]!.type).toBe("high_af");
    expect(flags[0]!.severity).toBe("critical");
  });

  it("high_af flag explanation contains the actual AF percentage", () => {
    // AF=6% → explanation should mention "6.00%"
    const variant = makeJointVariant(600, 10000, 0);
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    expect(flags[0]!.explanation).toContain("6.00%");
    expect(flags[0]!.explanation).toContain("5%");
  });

  it("returns high_hom flag for anomalously high homozygote count", () => {
    // AF=0.01, AN=100000, expected_hom=10, observed_hom=60 → 60>50
    const variant = makeJointVariant(1000, 100000, 60);
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    const homFlag = flags.find((f) => f.type === "high_hom");
    expect(homFlag).toBeDefined();
    expect(homFlag!.severity).toBe("warning");
  });

  it("high_hom flag explanation contains observed and expected counts", () => {
    // AF=0.01, AN=100000, expected_hom=10, observed_hom=60
    const variant = makeJointVariant(1000, 100000, 60);
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    const homFlag = flags.find((f) => f.type === "high_hom");
    expect(homFlag!.explanation).toContain("60"); // observed
    expect(homFlag!.explanation).toContain("10.0"); // expected
    expect(homFlag!.explanation).toContain("5"); // multiplier
  });

  it("returns gnomad_filtered flag for a QC-failed variant", () => {
    const variant = makeExomeGenomeVariant(10, 10000, 0, 0, 0, 0, ["RF"]);
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    const filteredFlag = flags.find((f) => f.type === "gnomad_filtered");
    expect(filteredFlag).toBeDefined();
    expect(filteredFlag!.severity).toBe("warning");
  });

  it("gnomad_filtered flag explanation contains the filter name", () => {
    const variant = makeExomeGenomeVariant(10, 10000, 0, 0, 0, 0, ["RF"]);
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    const filteredFlag = flags.find((f) => f.type === "gnomad_filtered");
    expect(filteredFlag!.explanation).toContain("RF");
  });

  it("gnomad_filtered explanation lists multiple filter names", () => {
    const variant = makeExomeGenomeVariant(10, 10000, 0, 0, 0, 0, ["RF", "AC0"]);
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    const filteredFlag = flags.find((f) => f.type === "gnomad_filtered");
    expect(filteredFlag!.explanation).toContain("RF");
    expect(filteredFlag!.explanation).toContain("AC0");
  });

  it("returns genomes_only flag for a genome-only variant", () => {
    const variant = makeGenomeOnlyVariant(100, 10000, 2);
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    const genomesFlag = flags.find((f) => f.type === "genomes_only");
    expect(genomesFlag).toBeDefined();
    expect(genomesFlag!.severity).toBe("info");
  });

  it("returns multiple flags when variant has multiple issues", () => {
    // High AF (6%) + genomes-only
    const variant: GnomadVariant = {
      variant_id: "1-12345-A-G",
      pos: 12345,
      ref: "A",
      alt: "G",
      transcript_consequence: null,
      genome: { ac: 600, an: 10000, ac_hom: 0, populations: [] },
    };
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    const types = flags.map((f) => f.type);
    expect(types).toContain("high_af");
    expect(types).toContain("genomes_only");
  });

  it("respects disabled flags in settings", () => {
    const settings: QualitySettings = {
      ...FACTORY_QUALITY_DEFAULTS,
      highAfEnabled: false,
    };
    const variant = makeJointVariant(600, 10000, 0); // Would normally flag high_af
    const flags = computeQualityFlags(variant, settings);
    expect(flags.find((f) => f.type === "high_af")).toBeUndefined();
  });

  it("each flag has a non-empty explanation string", () => {
    // Test with all flags triggered
    const variant: GnomadVariant = {
      variant_id: "1-12345-A-G",
      pos: 12345,
      ref: "A",
      alt: "G",
      transcript_consequence: null,
      genome: {
        ac: 600,
        an: 10000,
        ac_hom: 0,
        filters: ["RF"],
        populations: [],
      },
    };
    const flags = computeQualityFlags(variant, FACTORY_QUALITY_DEFAULTS);
    for (const flag of flags) {
      expect(flag.explanation).toBeTruthy();
      expect(flag.explanation.length).toBeGreaterThan(10);
    }
  });
});

// ─── shouldExcludeByQuality tests ────────────────────────────────────────────

describe("shouldExcludeByQuality", () => {
  it("returns true when high_af flag is present and exclusion is enabled", () => {
    const flags = [
      {
        type: "high_af" as const,
        label: "High AF",
        explanation: "...",
        severity: "critical" as const,
      },
    ];
    const exclusion: QualityExclusionConfig = {
      ...FACTORY_EXCLUSION_DEFAULTS,
      excludeHighAf: true,
    };
    expect(shouldExcludeByQuality(flags, exclusion)).toBe(true);
  });

  it("returns false when high_af flag is present but exclusion is disabled", () => {
    const flags = [
      {
        type: "high_af" as const,
        label: "High AF",
        explanation: "...",
        severity: "critical" as const,
      },
    ];
    const exclusion: QualityExclusionConfig = {
      ...FACTORY_EXCLUSION_DEFAULTS,
      excludeHighAf: false,
    };
    expect(shouldExcludeByQuality(flags, exclusion)).toBe(false);
  });

  it("returns false when flags are empty", () => {
    expect(shouldExcludeByQuality([], FACTORY_EXCLUSION_DEFAULTS)).toBe(false);
  });

  it("returns true when high_hom flag matches active exclusion", () => {
    const flags = [
      {
        type: "high_hom" as const,
        label: "High Hom",
        explanation: "...",
        severity: "warning" as const,
      },
    ];
    const exclusion: QualityExclusionConfig = {
      ...FACTORY_EXCLUSION_DEFAULTS,
      excludeHighHom: true,
    };
    expect(shouldExcludeByQuality(flags, exclusion)).toBe(true);
  });

  it("returns true when gnomad_filtered flag matches active exclusion", () => {
    const flags = [
      {
        type: "gnomad_filtered" as const,
        label: "QC Filtered",
        explanation: "...",
        severity: "warning" as const,
      },
    ];
    const exclusion: QualityExclusionConfig = {
      ...FACTORY_EXCLUSION_DEFAULTS,
      excludeGnomadFiltered: true,
    };
    expect(shouldExcludeByQuality(flags, exclusion)).toBe(true);
  });

  it("returns true when genomes_only flag matches active exclusion", () => {
    const flags = [
      {
        type: "genomes_only" as const,
        label: "Genomes Only",
        explanation: "...",
        severity: "info" as const,
      },
    ];
    const exclusion: QualityExclusionConfig = {
      ...FACTORY_EXCLUSION_DEFAULTS,
      excludeGenomesOnly: true,
    };
    expect(shouldExcludeByQuality(flags, exclusion)).toBe(true);
  });

  it("returns false when all factory defaults are used (none excluded)", () => {
    const flags = [
      {
        type: "high_af" as const,
        label: "High AF",
        explanation: "...",
        severity: "critical" as const,
      },
      {
        type: "genomes_only" as const,
        label: "Genomes Only",
        explanation: "...",
        severity: "info" as const,
      },
    ];
    expect(shouldExcludeByQuality(flags, FACTORY_EXCLUSION_DEFAULTS)).toBe(false);
  });
});
