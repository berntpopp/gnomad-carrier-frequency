import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeGraphQLQuery } from "../src/client/index.js";

describe("executeGraphQLQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends GraphQL query via POST and returns parsed JSON", async () => {
    const mockData = { data: { gene: { gene_id: "123" } } };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const res = await executeGraphQLQuery({ query: "{ gene { gene_id } }" });
    expect(res).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws error when HTTP status is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(
      executeGraphQLQuery({ query: "{ gene { gene_id } }" }),
    ).rejects.toThrow("GraphQL request failed: 500");
  });
});
