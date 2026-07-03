import { describe, expect, it } from "vitest";
import { buildXlsxBlob } from "../xlsx-export";

describe("buildXlsxBlob", () => {
  it("creates an xlsx blob from plain object sheets", async () => {
    const blob = await buildXlsxBlob([
      {
        name: "Summary",
        rows: [
          {
            gene: "CFTR",
            carrierFrequency: 0.044,
            hasClinVar: true,
            metadata: { source: "test" },
          },
        ],
      },
    ]);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("creates a workbook when all sheets are empty", async () => {
    const blob = await buildXlsxBlob([{ name: "Variants", rows: [] }]);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
