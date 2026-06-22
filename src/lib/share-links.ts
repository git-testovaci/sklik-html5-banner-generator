export function generateShareId(): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `share-${Date.now().toString(36)}-${suffix}`;
}

export function getPreviewUrl(shareId: string): string {
  if (typeof window === "undefined") {
    return `/preview/${shareId}`;
  }
  return `${window.location.origin}/preview/${shareId}`;
}
