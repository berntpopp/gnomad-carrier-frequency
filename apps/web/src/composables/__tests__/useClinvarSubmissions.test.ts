import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useClinvarSubmissions } from "../useClinvarSubmissions";
import { useGnomadVersion } from "@/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function runWithTimers<T>(fn: () => Promise<T>): Promise<T> {
  const promise = fn();
  await vi.runAllTimersAsync();
  return promise;
}

describe("useClinvarSubmissions", () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    setActivePinia(createPinia());
    fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("fetches submissions with { query, variables } POST body and populates the map", async () => {
    const ids = ["1-10001-A-T", "1-10002-C-G"];
    fetchSpy.mockResolvedValueOnce(okResponse(ids));

    const { fetchSubmissions, submissions, isLoading, error, progress } =
      useClinvarSubmissions();

    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).toBeNull();
    expect(isLoading.value).toBe(false);
    expect(progress.value).toBe(100);
    expect(submissions.value.size).toBe(2);
    expect(submissions.value.has("1-10001-A-T")).toBe(true);
    expect(submissions.value.has("1-10002-C-G")).toBe(true);

    // Verify POST body format
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://gnomad.broadinstitute.org/api",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringMatching(/"variables":\{"refGenome":"GRCh38"/),
      }),
    );
  });

  it("does nothing for empty variant list", async () => {
    const { fetchSubmissions } = useClinvarSubmissions();
    await fetchSubmissions([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("clears state on clearSubmissions", async () => {
    const ids = ["1-10001-A-T"];
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
    const ids = ["1-10001-A-T"];
    fetchSpy
      .mockResolvedValueOnce(errorResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(errorResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(okResponse(ids));

    const { fetchSubmissions, submissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).toBeNull();
    expect(submissions.value.size).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("does not retry on client error (400)", async () => {
    const ids = ["1-10001-A-T"];
    fetchSpy.mockResolvedValueOnce(errorResponse(400, "Bad Request"));

    const { fetchSubmissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).toContain("failed");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 rate limit", async () => {
    const ids = ["1-10001-A-T"];
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
    const ids = ["1-10001-A-T"];
    fetchSpy.mockResolvedValue(errorResponse(500, "Internal Server Error"));

    const { fetchSubmissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).not.toBeNull();
    expect(error.value).toContain("failed");
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("continues processing remaining batches when one fails", async () => {
    const ids = Array.from({ length: 60 }, (_, i) => `1-${10000 + i}-A-T`);
    const batch2Ids = ids.slice(50);

    fetchSpy
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(okResponse(batch2Ids));

    const { fetchSubmissions, submissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    expect(submissions.value.size).toBe(batch2Ids.length);
    for (const id of batch2Ids) {
      expect(submissions.value.has(id)).toBe(true);
    }
    expect(error.value).toContain("1 of 2 batch(es) failed");
  });

  it("retryFailed re-fetches only previously failed variant IDs", async () => {
    const ids = Array.from({ length: 60 }, (_, i) => `1-${10000 + i}-A-T`);
    const batch1Ids = ids.slice(0, 50);
    const batch2Ids = ids.slice(50);

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

    fetchSpy.mockResolvedValueOnce(okResponse(batch1Ids));

    await runWithTimers(() => retryFailed());

    expect(error.value).toBeNull();
    expect(submissions.value.size).toBe(previousSize + batch1Ids.length);
  });

  it("retryFailed is a no-op when nothing has failed", async () => {
    const ids = ["1-10001-A-T"];
    fetchSpy.mockResolvedValueOnce(okResponse(ids));

    const { fetchSubmissions, retryFailed } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    fetchSpy.mockClear();
    await retryFailed();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles GraphQL errors with retries", async () => {
    const ids = ["1-10001-A-T"];
    fetchSpy.mockResolvedValue(graphqlErrorResponse("Query too complex"));

    const { fetchSubmissions, error } = useClinvarSubmissions();
    await runWithTimers(() => fetchSubmissions(ids));

    expect(error.value).toContain("failed");
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("tracks progress across batches", async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `1-${10000 + i}-A-T`);
    const batch1Ids = ids.slice(0, 50);
    const batch2Ids = ids.slice(50);

    fetchSpy
      .mockResolvedValueOnce(okResponse(batch1Ids))
      .mockResolvedValueOnce(okResponse(batch2Ids));

    const { fetchSubmissions, progress } = useClinvarSubmissions();

    await runWithTimers(() => fetchSubmissions(ids));

    expect(progress.value).toBe(100);
  });

  it("cancels in-flight batches when switching assembly (PLAN-04)", async () => {
    const { setVersion } = useGnomadVersion();
    setVersion("v4"); // GRCh38

    const ids = Array.from({ length: 100 }, (_, i) => `1-${10000 + i}-A-T`);
    const batch1Ids = ids.slice(0, 50);

    let resolveBatch1: (resp: Response) => void = () => {};
    const batch1Promise = new Promise<Response>((resolve) => {
      resolveBatch1 = resolve;
    });

    fetchSpy.mockReturnValueOnce(batch1Promise);

    const { fetchSubmissions, submissions } = useClinvarSubmissions();
    const fetchPromise = fetchSubmissions(ids);

    // Switch version to v2 (GRCh37) while batch 1 is in flight
    setVersion("v2");

    // Resolve batch 1
    resolveBatch1(okResponse(batch1Ids));
    await runWithTimers(() => fetchPromise);

    // Results from stale assembly should have been discarded
    expect(submissions.value.size).toBe(0);
  });
});
