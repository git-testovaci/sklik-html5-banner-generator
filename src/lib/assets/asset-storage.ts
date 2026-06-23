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

function isClient(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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

const objectUrlCache = new Map<string, string>();

export async function createAssetObjectUrl(
  assetId: string,
): Promise<AssetStorageResult<string>> {
  const cached = objectUrlCache.get(assetId);
  if (cached) return { ok: true, value: cached };

  const blobResult = await getAssetBlob(assetId);
  if (!blobResult.ok) return blobResult;
  if (!blobResult.value) {
    return { ok: false, message: "Asset blob not found." };
  }

  try {
    const url = URL.createObjectURL(blobResult.value);
    objectUrlCache.set(assetId, url);
    return { ok: true, value: url };
  } catch {
    return { ok: false, message: "Could not create preview URL." };
  }
}

export function revokeAssetObjectUrl(url: string): void {
  if (typeof URL === "undefined" || !URL.revokeObjectURL) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
  for (const [assetId, cached] of objectUrlCache.entries()) {
    if (cached === url) {
      objectUrlCache.delete(assetId);
      break;
    }
  }
}

export function revokeAllAssetObjectUrls(): void {
  for (const url of objectUrlCache.values()) {
    revokeAssetObjectUrl(url);
  }
  objectUrlCache.clear();
}

export function invalidateAssetObjectUrl(assetId: string): void {
  const cached = objectUrlCache.get(assetId);
  if (cached) {
    revokeAssetObjectUrl(cached);
    objectUrlCache.delete(assetId);
  }
}
