import { describe, it, expect } from "vitest";
import {
  encodeExclusions,
  decodeExclusions,
  exclusionsTooLargeForUrl,
} from "../src/utils/exclusion-url.js";

describe("exclusion-url compression utilities", () => {
  it("encodes and decodes variant IDs cleanly", () => {
    const ids = ["1-12345-A-G", "2-67890-C-T", "X-1000-T-C"];
    const encoded = encodeExclusions(ids);
    expect(encoded).toBeTruthy();
    expect(typeof encoded).toBe("string");

    const decoded = decodeExclusions(encoded!);
    expect(decoded).toEqual(ids);
  });

  it("returns null for empty variant array", () => {
    expect(encodeExclusions([])).toBeNull();
  });

  it("returns empty array when decoding empty string or invalid compressed data", () => {
    expect(decodeExclusions("")).toEqual([]);
    expect(decodeExclusions("invalid-gibberish-123$%#")).toEqual([]);
  });

  it("detects when exclusions list is too large for URL", () => {
    // Generate a massive array of variant IDs
    const hugeList = Array.from({ length: 500 }, (_, i) => `1-${100000 + i}-A-G_some_extra_long_identifier_padding`);
    expect(exclusionsTooLargeForUrl(hugeList)).toBe(true);
    expect(encodeExclusions(hugeList)).toBeNull();
  });
});
