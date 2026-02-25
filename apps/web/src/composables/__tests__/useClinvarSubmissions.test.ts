import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useClinvarSubmissions } from "../useClinvarSubmissions";

// Mock getReferenceGenome — always return GRCh38
vi.mock("@gnomad-cf/core/config", () => ({
  getReferenceGenome: () => "GRCh38" as const,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a successful fetch Response with gnomAD-shaped submission data */
function makeSubmissionsResponse(variantIds: string[]): Record<
  string,
  {
    variant_id: string;
    submissions: { clinical_significance: string }[];
  } | null
> {
  const data: Record<
    string,
    {
      variant_id: string;
      submissions: { clinical_significance: string }[];
    } | null
  > = {};
  variantIds.forEach((id, i) => {
    data[`v${i}`] = {
      variant_id: id,
      submissions: [
        { clinical_significance: "Pathogenic" },
        { clinical_significance: "Benign" },
      ],
    };
  });
  return data;
}

function okResponse(variantIds: string[]): Response {
  return new Response(
    JSON.stringify({ data: makeSubmissionsResponse(variantIds) }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function errorResponse(status: number, text = "Error"): Response {
  return new Response(text, { status, statusText: text });
}

function graphqlErrorResponse(message: string): Response {
  return new Response(JSON.stringify({ errors: [{ message }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Start an async operation and flush all fake timers so backoff delays resolve.
 * Returns the settled promise.
 */
async function runWithTimers<T>(fn: () => Promise<T>): Promise<T> {
  const promise = fn();
  await vi.runAllTimersAsync();
  return promise;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useClinvarSubmissions", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("fetches submissions and populates the map", async () => {
    const ids = ["var-1", "var-2"];
    fetchSpy.mockResolvedValueOnce(okResponse(ids));

    const { fetchSubmissions, submissions, isLoading, error, progress } =
      useClinvarSubmissions();

    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).toBeNull();
    expect(isLoading.value).toBe(false);
    expect(progress.value).toBe(100);
    expect(submissions.value.size).toBe(2);
    expect(submissions.value.has("var-1")).toBe(true);
    expect(submissions.value.has("var-2")).toBe(true);
  });

  it("does nothing for empty variant list", async () => {
    const { fetchSubmissions } = useClinvarSubmissions();
    await fetchSubmissions([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("clears state on clearSubmissions", async () => {
    const ids = ["var-1"];
    fetchSpy.mockResolvedValueOnce(okResponse(ids));

    const { fetchSubmissions, clearSubmissions, submissions, progress, error } =
      useClinvarSubmissions();

    await runWithTimers(() => fetchSubmissions(ids));
    expect(submissions.value.size).toBe(1);

    clearSubmissions();
    expect(submissions.value.size).toBe(0);
    expect(progress.value).toBe(0);
    expect(error.value).toBeNull();
  });

  it("retries on server error (500) with exponential backoff", async () => {
    const ids = ["var-1"];
    // Fail twice with 500, then succeed on attempt 2
    fetchSpy
      .mockResolvedValueOnce(errorResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(errorResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(okResponse(ids));

    const { fetchSubmissions, submissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).toBeNull();
    expect(submissions.value.size).toBe(1);
    // attempt 0 (500), attempt 1 (500), attempt 2 (200) = 3 calls
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("does not retry on client error (400)", async () => {
    const ids = ["var-1"];
    fetchSpy.mockResolvedValueOnce(errorResponse(400, "Bad Request"));

    const { fetchSubmissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    // Should fail immediately without retrying
    expect(error.value).toContain("failed");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 rate limit", async () => {
    const ids = ["var-1"];
    fetchSpy
      .mockResolvedValueOnce(errorResponse(429, "Too Many Requests"))
      .mockResolvedValueOnce(okResponse(ids));

    const { fetchSubmissions, submissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).toBeNull();
    expect(submissions.value.size).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("reports error after exhausting all retries", async () => {
    const ids = ["var-1"];
    // Fail on all 4 attempts (initial + 3 retries)
    fetchSpy.mockResolvedValue(errorResponse(500, "Internal Server Error"));

    const { fetchSubmissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).not.toBeNull();
    expect(error.value).toContain("failed");
    // initial + MAX_RETRIES (3) = 4 attempts
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("continues processing remaining batches when one fails", async () => {
    // Create 60 IDs = 2 batches (batch size is 50)
    const ids = Array.from({ length: 60 }, (_, i) => `var-${i}`);
    const batch2Ids = ids.slice(50);

    // First batch fails all retries, second batch succeeds
    fetchSpy
      .mockResolvedValueOnce(errorResponse(500)) // batch 1 attempt 0
      .mockResolvedValueOnce(errorResponse(500)) // batch 1 attempt 1
      .mockResolvedValueOnce(errorResponse(500)) // batch 1 attempt 2
      .mockResolvedValueOnce(errorResponse(500)) // batch 1 attempt 3
      .mockResolvedValueOnce(okResponse(batch2Ids)); // batch 2 succeeds

    const { fetchSubmissions, submissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    // Batch 2 should have succeeded despite batch 1 failing
    expect(submissions.value.size).toBe(batch2Ids.length);
    for (const id of batch2Ids) {
      expect(submissions.value.has(id)).toBe(true);
    }
    // Error should report the failed batch
    expect(error.value).toContain("1 of 2 batch(es) failed");
  });

  it("retryFailed re-fetches only previously failed variant IDs", async () => {
    // Create 60 IDs = 2 batches
    const ids = Array.from({ length: 60 }, (_, i) => `var-${i}`);
    const batch1Ids = ids.slice(0, 50);
    const batch2Ids = ids.slice(50);

    // First batch fails, second succeeds
    fetchSpy
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(okResponse(batch2Ids));

    const { fetchSubmissions, retryFailed, submissions, error } =
      useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).toContain("1 of 2");
    const previousSize = submissions.value.size;

    // Now retry — mock success for the failed batch
    fetchSpy.mockResolvedValueOnce(okResponse(batch1Ids));

    await runWithTimers(() => retryFailed());

    expect(error.value).toBeNull();
    expect(submissions.value.size).toBe(previousSize + batch1Ids.length);
  });

  it("retryFailed is a no-op when nothing has failed", async () => {
    const ids = ["var-1"];
    fetchSpy.mockResolvedValueOnce(okResponse(ids));

    const { fetchSubmissions, retryFailed } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    fetchSpy.mockClear();
    await retryFailed();

    // Should not have made any new calls
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles GraphQL errors with retries", async () => {
    const ids = ["var-1"];
    // GraphQL errors (200 status with errors array) are retried since
    // the error message doesn't start with "HTTP 4"
    fetchSpy.mockResolvedValue(graphqlErrorResponse("Query too complex"));

    const { fetchSubmissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).toContain("failed");
    // Should have retried: initial + 3 retries = 4 attempts
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("tracks progress across batches", async () => {
    // 100 IDs = 2 batches
    const ids = Array.from({ length: 100 }, (_, i) => `var-${i}`);
    const batch1Ids = ids.slice(0, 50);
    const batch2Ids = ids.slice(50);

    fetchSpy
      .mockResolvedValueOnce(okResponse(batch1Ids))
      .mockResolvedValueOnce(okResponse(batch2Ids));

    const { fetchSubmissions, progress } = useClinvarSubmissions();

    await runWithTimers(() => fetchSubmissions(ids));

    // After completion, progress should be 100
    expect(progress.value).toBe(100);
  });
});
