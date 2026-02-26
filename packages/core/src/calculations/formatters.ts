// Display formatting functions for frequencies

import { config } from "../config/index.js";

// Decimal places from config
const { frequencyDecimalPlaces } = config.settings;

/**
 * Display format type for frequency values.
 * - "percent": e.g. "4.31%"
 * - "ratio": e.g. "1:23"
 * - "scientific": e.g. "4.31 × 10⁻²"
 * - "per100k": e.g. "4,310 / 100,000"
 */
export type DisplayFormat = "percent" | "ratio" | "scientific" | "per100k";

/**
 * Format frequency as percentage string
 * Returns "Not detected" for null values
 */
export function frequencyToPercent(frequency: number | null): string {
  if (frequency === null) return "Not detected";
  return `${(frequency * 100).toFixed(frequencyDecimalPlaces)}%`;
}

/**
 * Format frequency as ratio string (e.g., "1:25")
 * Returns "Not detected" for null or zero values
 */
export function frequencyToRatio(frequency: number | null): string {
  if (frequency === null) return "Not detected";
  if (frequency === 0) return "Not detected";
  const ratio = Math.round(1 / frequency);
  return `1:${ratio.toLocaleString()}`;
}

/**
 * Format carrier frequency with both percent and ratio representations
 */
export function formatCarrierFrequency(frequency: number | null): {
  percent: string;
  ratio: string;
} {
  return {
    percent: frequencyToPercent(frequency),
    ratio: frequencyToRatio(frequency),
  };
}

/**
 * Unicode superscript character map for scientific notation exponents.
 * Note: These code points are NOT in a contiguous block — use this explicit map.
 * 0=\u2070, 1=\u00B9, 2=\u00B2, 3=\u00B3, 4-9=\u2074-\u2079, -=\u207B
 */
const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "\u2070",
  "1": "\u00B9",
  "2": "\u00B2",
  "3": "\u00B3",
  "4": "\u2074",
  "5": "\u2075",
  "6": "\u2076",
  "7": "\u2077",
  "8": "\u2078",
  "9": "\u2079",
  "-": "\u207B",
};

/**
 * Format frequency as scientific notation with Unicode superscript exponent.
 * Returns "Not detected" for null or zero values.
 * Locale-aware: decimal separator is comma for de-DE, period for en-US.
 *
 * Example (en-US): 0.0431 -> "4.31 × 10⁻²"
 * Example (de-DE): 0.0431 -> "4,31 × 10⁻²"
 */
export function frequencyToScientific(
  frequency: number | null,
  locale: string = "en-US",
): string {
  if (frequency === null || frequency === 0) return "Not detected";

  const formatter = new Intl.NumberFormat(locale, {
    notation: "scientific",
    minimumSignificantDigits: 3,
    maximumSignificantDigits: 3,
  });

  const parts = formatter.formatToParts(frequency);
  let mantissa = "";
  let exponent = "";
  let inExponent = false;
  let hasExponentMinus = false;

  for (const part of parts) {
    if (part.type === "exponentSeparator") {
      inExponent = true;
      continue;
    }
    if (part.type === "exponentMinusSign") {
      hasExponentMinus = true;
      continue;
    }
    if (part.type === "exponentInteger") {
      exponent = part.value;
      continue;
    }
    if (!inExponent) {
      mantissa += part.value;
    }
  }

  const supExp =
    (hasExponentMinus ? "\u207B" : "") +
    exponent
      .split("")
      .map((d) => SUPERSCRIPT_MAP[d] ?? d)
      .join("");

  // \u00D7 = ×
  return `${mantissa} \u00D7 10${supExp}`;
}

/**
 * Format frequency as per-100,000 with locale-aware thousands separator.
 * Returns "Not detected" for null or zero values.
 *
 * Example (en-US): 0.0431 -> "4,310 / 100,000"
 * Example (de-DE): 0.0431 -> "4.310 / 100.000"
 */
export function frequencyToPerHundredK(
  frequency: number | null,
  locale: string = "en-US",
): string {
  if (frequency === null || frequency === 0) return "Not detected";
  const value = frequency * 100_000;
  const numerator = value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const denominator = (100_000).toLocaleString(locale);
  return `${numerator} / ${denominator}`;
}
