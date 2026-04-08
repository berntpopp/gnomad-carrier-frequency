import * as Comlink from "comlink";
import type { VariantWorkerAPI } from "./variant-worker";
import type { ProcessGeneParams, RefilterParams, WorkerResult } from "./types";

let worker: Worker | null = null;
let api: Comlink.Remote<VariantWorkerAPI> | null = null;

function getWorkerAPI(): Comlink.Remote<VariantWorkerAPI> {
  if (api) return api;

  worker = new Worker(
    new URL("./variant-worker.ts", import.meta.url),
    { type: "module" },
  );

  api = Comlink.wrap<VariantWorkerAPI>(worker);
  return api;
}

export async function processGene(
  params: ProcessGeneParams,
): Promise<WorkerResult> {
  return getWorkerAPI().processGene(params);
}

export async function refilter(
  params: RefilterParams,
): Promise<WorkerResult> {
  return getWorkerAPI().refilter(params);
}

export async function clearCache(geneSymbol?: string): Promise<void> {
  return getWorkerAPI().clearCache(geneSymbol);
}

export async function getCacheSize(): Promise<number> {
  return getWorkerAPI().getCacheSize();
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    api = null;
  }
}
