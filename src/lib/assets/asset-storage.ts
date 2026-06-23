const DB_NAME = "sklik-html5-banner-generator.assets.v1";
const STORE_NAME = "blobs";
const DB_VERSION = 1;

export interface AssetStorageError {
  ok: false;
  message: string;
}

export interface AssetStorageSuccess<T> {
  ok: true;
  value: T;
}

export type AssetStorageResult<T> = AssetStorageSuccess<T> | AssetStorageError;

interface PreviewUrlEntry {
  url: string;
  metaKey: string;
}

function isClient(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!isClient()) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(new Error("IndexedDB unavailable"));
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<AssetStorageResult<T>> {
  if (!isClient()) {
    return { ok: false, message: "Asset storage is only available in the browser." };
  }

  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = fn(store);

      request.onsuccess = () => resolve({ ok: true, value: request.result });
      request.onerror = () =>
        resolve({ ok: false, message: "IndexedDB operation failed." });
      tx.onerror = () =>
        resolve({ ok: false, message: "IndexedDB transaction failed." });
    });
  } catch {
    return { ok: false, message: "IndexedDB is unavailable." };
  }
}

export async function saveAssetBlob(
  assetId: string,
  blob: Blob,
): Promise<AssetStorageResult<void>> {
  failedPreviewAssetIds.delete(assetId);
  const result = await withStore("readwrite", (store) => store.put(blob, assetId));
  if (!result.ok) return result;
  return { ok: true, value: undefined };
}

export async function getAssetBlob(
  assetId: string,
): Promise<AssetStorageResult<Blob | undefined>> {
  return withStore("readonly", (store) => store.get(assetId));
}

export async function deleteAssetBlob(
  assetId: string,
): Promise<AssetStorageResult<void>> {
  invalidateAssetObjectUrl(assetId);
  failedPreviewAssetIds.delete(assetId);
  const result = await withStore("readwrite", (store) => store.delete(assetId));
  if (!result.ok) return result;
  return { ok: true, value: undefined };
}

export async function deleteAssetsByProject(
  _projectId: string,
  assetIds: string[],
): Promise<void> {
  await Promise.all(assetIds.map((id) => deleteAssetBlob(id)));
}

/** Stable cache key: sorted id:size pairs */
export function buildAssetsMetaKey(
  assets: readonly { id: string; size: number }[],
): string {
  if (assets.length === 0) return "";
  return [...assets]
    .map((a) => `${a.id}:${a.size}`)
    .sort()
    .join("|");
}

export function assetMetaKey(assetId: string, size: number): string {
  return `${assetId}:${size}`;
}

const previewUrlCache = new Map<string, PreviewUrlEntry>();
const previewUrlInflight = new Map<string, Promise<AssetStorageResult<string>>>();
const failedPreviewAssetIds = new Set<string>();

function revokeCachedUrl(assetId: string): void {
  const entry = previewUrlCache.get(assetId);
  if (!entry) return;
  if (typeof URL !== "undefined" && URL.revokeObjectURL) {
    try {
      URL.revokeObjectURL(entry.url);
    } catch {
      // ignore
    }
  }
  previewUrlCache.delete(assetId);
}

export async function getPreviewAssetUrl(
  assetId: string,
  metaKey: string,
): Promise<AssetStorageResult<string>> {
  if (failedPreviewAssetIds.has(assetId)) {
    return { ok: false, message: "Asset blob not found." };
  }

  const cached = previewUrlCache.get(assetId);
  if (cached && cached.metaKey === metaKey) {
    return { ok: true, value: cached.url };
  }

  if (cached) {
    revokeCachedUrl(assetId);
  }

  const inflightKey = `${assetId}:${metaKey}`;
  const existing = previewUrlInflight.get(inflightKey);
  if (existing) return existing;

  const promise = (async (): Promise<AssetStorageResult<string>> => {
    const blobResult = await getAssetBlob(assetId);
    if (!blobResult.ok) return blobResult;
    if (!blobResult.value) {
      failedPreviewAssetIds.add(assetId);
      return { ok: false, message: "Asset blob not found." };
    }

    try {
      const url = URL.createObjectURL(blobResult.value);
      previewUrlCache.set(assetId, { url, metaKey });
      return { ok: true, value: url };
    } catch {
      return { ok: false, message: "Could not create preview URL." };
    }
  })();

  previewUrlInflight.set(inflightKey, promise);
  try {
    return await promise;
  } finally {
    previewUrlInflight.delete(inflightKey);
  }
}

export async function loadPreviewAssetUrls(
  metaKey: string,
): Promise<{ urls: Record<string, string>; missing: string[] }> {
  const urls: Record<string, string> = {};
  const missing: string[] = [];
  if (!metaKey) return { urls, missing };

  const parts = metaKey.split("|").filter(Boolean);
  await Promise.all(
    parts.map(async (part) => {
      const colon = part.indexOf(":");
      if (colon <= 0) return;
      const assetId = part.slice(0, colon);
      const result = await getPreviewAssetUrl(assetId, part);
      if (result.ok) urls[assetId] = result.value;
      else missing.push(assetId);
    }),
  );

  return { urls, missing };
}

export function prunePreviewUrls(keepAssetIds: ReadonlySet<string>): void {
  for (const assetId of previewUrlCache.keys()) {
    if (!keepAssetIds.has(assetId)) {
      revokeCachedUrl(assetId);
    }
  }
}

/** @deprecated use getPreviewAssetUrl */
export async function createAssetObjectUrl(
  assetId: string,
): Promise<AssetStorageResult<string>> {
  const cached = previewUrlCache.get(assetId);
  if (cached) return { ok: true, value: cached.url };
  return getPreviewAssetUrl(assetId, assetId);
}

export function revokeAssetObjectUrl(url: string): void {
  if (typeof URL === "undefined" || !URL.revokeObjectURL) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
  for (const [assetId, entry] of previewUrlCache.entries()) {
    if (entry.url === url) {
      previewUrlCache.delete(assetId);
      break;
    }
  }
}

export function revokeAllAssetObjectUrls(): void {
  for (const assetId of [...previewUrlCache.keys()]) {
    revokeCachedUrl(assetId);
  }
  previewUrlCache.clear();
  failedPreviewAssetIds.clear();
  previewUrlInflight.clear();
}

export function invalidateAssetObjectUrl(assetId: string): void {
  revokeCachedUrl(assetId);
  failedPreviewAssetIds.delete(assetId);
}
