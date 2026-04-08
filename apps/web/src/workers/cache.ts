import { openDB, type IDBPDatabase } from "idb";
import type { CachedResponse } from "./types";

const DB_NAME = "gnomad-cf-cache";
const DB_VERSION = 1;
const STORE_NAME = "variant-responses";

export async function openVariantCache(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    },
  });
}

export function buildCacheKey(
  geneSymbol: string,
  dataset: string,
  referenceGenome: string,
): string {
  return `${geneSymbol}:${dataset}:${referenceGenome}`;
}

export async function getCachedResponse(
  key: string,
): Promise<CachedResponse | null> {
  const db = await openVariantCache();
  try {
    const result = await db.get(STORE_NAME, key);
    return (result as CachedResponse) ?? null;
  } finally {
    db.close();
  }
}

export async function putCachedResponse(entry: CachedResponse): Promise<void> {
  const db = await openVariantCache();
  try {
    await db.put(STORE_NAME, entry);
  } finally {
    db.close();
  }
}

export async function clearAllCache(): Promise<void> {
  const db = await openVariantCache();
  try {
    await db.clear(STORE_NAME);
  } finally {
    db.close();
  }
}

export async function clearCacheByGene(geneSymbol: string): Promise<void> {
  const db = await openVariantCache();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const prefix = `${geneSymbol}:`;
    let cursor = await store.openCursor();
    while (cursor) {
      if (typeof cursor.key === "string" && cursor.key.startsWith(prefix)) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } finally {
    db.close();
  }
}

export async function getCacheSize(): Promise<number> {
  const db = await openVariantCache();
  try {
    return await db.count(STORE_NAME);
  } finally {
    db.close();
  }
}
