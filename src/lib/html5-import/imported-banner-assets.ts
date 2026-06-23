import JSZip from "jszip";
import { saveAssetBlob } from "@/lib/assets/asset-storage";
import {
  compressImageIfNeeded,
  readImageDimensions,
  resolveMimeType,
} from "@/lib/assets/image-utils";
import {
  createDefaultAssetPlacement,
  fitBackgroundPlacement,
} from "@/lib/animation/timeline-utils";
import type { BannerAsset } from "@/types/assets";
import type { BannerProject } from "@/types/project";
import type { ImportedZipFileEntry, ImportImageSummary } from "@/types/imported-banner";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"]);

const LOGO_HINTS = /logo|brand|mark|icon/i;
const BG_HINTS = /background|bg|backdrop/i;

export function summarizeImportImages(
  files: ImportedZipFileEntry[],
): ImportImageSummary[] {
  const images = files.filter((f) => f.kind === "image");
  const largest = [...images].sort((a, b) => b.size - a.size)[0];

  return images.map((img) => {
    let suggestedRole: ImportImageSummary["suggestedRole"] = "decoration";
    if (LOGO_HINTS.test(img.name)) suggestedRole = "logo";
    else if (BG_HINTS.test(img.name)) suggestedRole = "background";
    else if (img === largest && images.length > 1) suggestedRole = "product";
    else if (images.length === 1) suggestedRole = "product";
    return {
      path: img.path,
      name: img.name,
      size: img.size,
      suggestedRole,
    };
  });
}

export interface ImportAssetSelection {
  logoPath?: string;
  productPath?: string;
  backgroundPath?: string;
}

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
  };
  return map[ext] ?? "application/octet-stream";
}

function isSafeImagePath(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXT.has(ext) && !path.includes("..");
}

async function blobFromZipPath(
  zip: JSZip,
  path: string,
): Promise<Blob | null> {
  const entry = zip.files[path];
  if (!entry || entry.dir) return null;
  try {
    const data = await entry.async("uint8array");
    if (data.byteLength > 500_000) return null;
    const mime = mimeFromPath(path);
    if (mime === "image/svg+xml") {
      const text = new TextDecoder().decode(data);
      if (/<script/i.test(text) || /on\w+\s*=/i.test(text)) return null;
    }
    return new Blob([new Uint8Array(data)], { type: mime });
  } catch {
    return null;
  }
}

export async function attachImportAssetsToProject(
  project: BannerProject,
  zipFile: File,
  selection: ImportAssetSelection,
): Promise<BannerProject> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
  } catch {
    return project;
  }

  let assets: BannerAsset[] = [...(project.assets ?? [])];
  let placements = [...(project.assetPlacements ?? [])];
  const now = new Date().toISOString();

  const slots: { path?: string; kind: BannerAsset["kind"] }[] = [
    { path: selection.logoPath, kind: "logo" },
    { path: selection.productPath, kind: "product" },
    { path: selection.backgroundPath, kind: "background" },
  ];

  for (const slot of slots) {
    if (!slot.path || !isSafeImagePath(slot.path)) continue;

    const rawBlob = await blobFromZipPath(zip, slot.path);
    if (!rawBlob) continue;

    const file = new File([rawBlob], slot.path.split("/").pop() ?? "image.png", {
      type: rawBlob.type,
    });
    const { blob, compressed } = await compressImageIfNeeded(file);
    const dims = await readImageDimensions(blob);
    const assetId = `asset-import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const saveResult = await saveAssetBlob(assetId, blob);
    if (!saveResult.ok) continue;

    assets = assets.filter((a) => a.kind !== slot.kind);
    placements = placements.filter((p) => p.kind !== slot.kind);

    const asset: BannerAsset = {
      id: assetId,
      projectId: project.id,
      kind: slot.kind,
      fileName: compressed
        ? (slot.path.split("/").pop() ?? "image.webp").replace(/\.[^.]+$/, ".webp")
        : slot.path.split("/").pop() ?? "image.png",
      mimeType: compressed && blob.type ? blob.type : resolveMimeType(file),
      size: blob.size,
      width: dims?.width ?? 100,
      height: dims?.height ?? 100,
      createdAt: now,
    };

    const placement =
      slot.kind === "background"
        ? fitBackgroundPlacement(assetId, project.width, project.height)
        : createDefaultAssetPlacement(assetId, slot.kind, project.width, project.height);

    assets.push(asset);
    placements.push(placement);
  }

  return { ...project, assets, assetPlacements: placements };
}
