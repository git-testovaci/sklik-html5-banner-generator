import { getAssetBlob } from "@/lib/assets/asset-storage";
import type { BannerAsset } from "@/types/assets";
import type { BannerEditorState } from "@/types/editor";

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

export interface AssetWarningItem {
  id: string;
  level: "info" | "warn" | "fail";
  message: string;
}

export async function collectAssetWarnings(
  state: BannerEditorState,
): Promise<AssetWarningItem[]> {
  const warnings: AssetWarningItem[] = [];
  const assets = state.assets ?? [];
  const visiblePlacements = (state.assetPlacements ?? []).filter((p) => p.visible);
  const visibleCount = visiblePlacements.length;

  if (visibleCount > 8) {
    warnings.push({
      id: "many-assets",
      level: "warn",
      message: `${visibleCount} visible image layers — may exceed ZIP size limit.`,
    });
  }

  let totalSize = 0;
  for (const asset of assets) {
    totalSize += asset.size;
    if (!ALLOWED_MIME.has(asset.mimeType)) {
      warnings.push({
        id: `mime-${asset.id}`,
        level: "fail",
        message: `${asset.fileName}: unsupported type ${asset.mimeType}`,
      });
    }
    if (asset.size > 200_000) {
      warnings.push({
        id: `size-${asset.id}`,
        level: "fail",
        message: `${asset.fileName} is ${Math.round(asset.size / 1024)} kB — compress before export.`,
      });
    } else if (asset.size > 80_000) {
      warnings.push({
        id: `size-warn-${asset.id}`,
        level: "warn",
        message: `${asset.fileName} is large — watch total ZIP size.`,
      });
    }
    if (asset.mimeType === "image/svg+xml") {
      warnings.push({
        id: `svg-${asset.id}`,
        level: "warn",
        message: `${asset.fileName}: SVG — verify no scripts before export.`,
      });
    }
    const maxDim = Math.max(asset.width, asset.height);
    const bannerMax = Math.max(state.width, state.height);
    if (maxDim > bannerMax * 3) {
      warnings.push({
        id: `dim-${asset.id}`,
        level: "warn",
        message: `${asset.fileName} is much larger than banner — consider resizing.`,
      });
    }
  }

  if (totalSize > 180_000) {
    warnings.push({
      id: "zip-risk",
      level: "warn",
      message: `Assets total ~${Math.round(totalSize / 1024)} kB — Sklik limit is 250 kB.`,
    });
  }

  for (const placement of visiblePlacements) {
    const asset = assets.find((a) => a.id === placement.assetId);
    if (!asset) continue;
    const blobResult = await getAssetBlob(asset.id);
    if (!blobResult.ok || !blobResult.value) {
      warnings.push({
        id: `missing-${asset.id}`,
        level: "fail",
        message: `Missing image blob for "${asset.fileName}" — re-upload or export will fail.`,
      });
    }
  }

  if (assets.length > 0) {
    warnings.push({
      id: "local-only",
      level: "info",
      message:
        "Images are stored in this browser only. Public preview on other devices may miss images.",
    });
  }

  return warnings;
}
