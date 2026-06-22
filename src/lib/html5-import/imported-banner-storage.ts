const SESSION_KEY = "sklik-html5-banner-generator.import.v1";

function isClient(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function saveImportedBannerSession(
  data: import("@/types/imported-banner").ImportedBannerSession,
): boolean {
  if (!isClient()) return false;
  try {
    const payload = {
      analysis: {
        ...data.analysis,
        previewHtml: data.analysis.previewHtml?.slice(0, 500_000) ?? null,
      },
      previewBlobUrls: [],
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadImportedBannerSession():
  | import("@/types/imported-banner").ImportedBannerSession
  | null {
  if (!isClient()) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as import("@/types/imported-banner").ImportedBannerSession;
    if (!parsed?.analysis?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearImportedBannerSession(): void {
  if (!isClient()) return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function revokeBlobUrls(urls: string[]): void {
  if (typeof URL === "undefined" || !URL.revokeObjectURL) return;
  for (const url of urls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
}
