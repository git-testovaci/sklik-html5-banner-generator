import type { BannerAsset } from "@/types/assets";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

export function validateAssetForExport(asset: BannerAsset): {
  ok: boolean;
  message: string;
} {
  if (!ALLOWED_MIME.has(asset.mimeType)) {
    return { ok: false, message: `Unsupported MIME type: ${asset.mimeType}` };
  }
  if (asset.size > 200_000) {
    return { ok: false, message: `${asset.fileName} exceeds 200 kB per asset.` };
  }
  return { ok: true, message: "OK" };
}

export function sanitizeAssetFileName(fileName: string): string {
  const base = fileName.split("/").pop()?.split("\\").pop() ?? "asset";
  const ext = base.includes(".") ? base.split(".").pop() ?? "png" : "png";
  const name = base.replace(/\.[^.]+$/, "");
  const safe = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `${safe || "asset"}.${safeExt || "png"}`;
}
