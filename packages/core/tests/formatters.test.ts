import { describe, it, expect } from "vitest";
import {
  frequencyToPercent,
  frequencyToRatio,
  frequencyToScientific,
  frequencyToPerHundredK,
} from "../src/calculations/formatters.js";

describe("frequencyToPercent", () => {
  it("formats a frequency as percentage", () => {
    expect(frequencyToPercent(0.0431)).toMatch(/4\.31%/);
  });

  it("returns 'Not detected' for null", () => {
    expect(frequencyToPercent(null)).toBe("Not detected");
  });
});

describe("frequencyToRatio", () => {
  it("formats a frequency as ratio", () => {
    expect(frequencyToRatio(0.0431)).toMatch(/^1:/);
  });

  it("returns 'Not detected' for null", () => {
    expect(frequencyToRatio(null)).toBe("Not detected");
  });

  it("returns 'Not detected' for zero", () => {
    expect(frequencyToRatio(0)).toBe("Not detected");
  });
});

describe("frequencyToScientific", () => {
  it("formats frequency in scientific notation with superscript exponent (en-US)", () => {
    const result = frequencyToScientific(0.0431, "en-US");
    // Should contain the mantissa digits
    expect(result).toContain("4.31");
    // Should contain the multiplication sign ×
    expect(result).toContain("\u00D7");
    // Should contain Unicode superscript minus ⁻ and superscript 2 ²
    expect(result).toContain("\u207B"); // superscript minus
    expect(result).toContain("\u00B2"); // superscript 2
  });

  it("uses comma decimal separator for de-DE locale", () => {
    const result = frequencyToScientific(0.0431, "de-DE");
    // German locale uses comma as decimal separator in mantissa
    expect(result).toContain("4,31");
    // Should still use × and superscript exponent
    expect(result).toContain("\u00D7");
  });

  it("returns 'Not detected' for null", () => {
    expect(frequencyToScientific(null)).toBe("Not detected");
  });

  it("returns 'Not detected' for zero", () => {
    expect(frequencyToScientific(0)).toBe("Not detected");
  });

  it("defaults to en-US locale when no locale specified", () => {
    const result = frequencyToScientific(0.0431);
    expect(result).toContain("4.31");
  });

  it("formats small frequencies correctly", () => {
    const result = frequencyToScientific(0.000001, "en-US");
    expect(result).toContain("\u00D7");
    expect(result).toContain("10");
  });

  it("formats frequency > 1 without minus sign in exponent", () => {
    // This is an edge case — carrier frequency won't exceed 1 but the function should handle it
    const result = frequencyToScientific(100, "en-US");
    expect(result).toContain("\u00D7");
    // Positive exponent: should NOT contain superscript minus
    expect(result).not.toContain("\u207B");
  });
});

describe("frequencyToPerHundredK", () => {
  it("formats frequency as per-100k with en-US locale (comma thousands separator)", () => {
    const result = frequencyToPerHundredK(0.0431, "en-US");
    // 0.0431 * 100,000 = 4,310
    expect(result).toContain("4,310");
    // Denominator locale-formatted for en-US
    expect(result).toContain("100,000");
    // Contains slash separator
    expect(result).toContain("/");
  });

  it("formats frequency as per-100k with de-DE locale (dot thousands separator)", () => {
    const result = frequencyToPerHundredK(0.0431, "de-DE");
    // German locale: 4310 -> "4.310", 100000 -> "100.000"
    expect(result).toContain("4.310");
    expect(result).toContain("100.000");
  });

  it("returns 'Not detected' for null", () => {
    expect(frequencyToPerHundredK(null)).toBe("Not detected");
  });

  it("returns 'Not detected' for zero", () => {
    expect(frequencyToPerHundredK(0)).toBe("Not detected");
  });

  it("defaults to en-US locale when no locale specified", () => {
    const result = frequencyToPerHundredK(0.0431);
    expect(result).toContain("100,000");
  });

  it("formats small frequencies with fractional per-100k value", () => {
    // 0.00001 * 100,000 = 1 (exactly 1 per 100k)
    const result = frequencyToPerHundredK(0.00001, "en-US");
    expect(result).toContain("100,000");
    // Should show "1" as numerator
    expect(result).toMatch(/^1 \//);
  });
});
