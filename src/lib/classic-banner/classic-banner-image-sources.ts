import {
  assetMetaKey,
  deleteAssetBlob,
  getAssetBlob,
  getPreviewAssetUrl,
  invalidateAssetObjectUrl,
  saveAssetBlob,
} from "@/lib/assets/asset-storage";
import {
  compressImageIfNeeded,
  readImageDimensions,
  resolveMimeType,
  validateImageFile,
} from "@/lib/assets/image-utils";
import type { BannerAsset, BannerAssetKind } from "@/types/assets";
import type { ClassicBannerContent } from "@/types/classic-banner";

export type ClassicBannerImageSlot = "background" | "logo" | "hero";

export type ClassicBannerImageSourceKind = "local" | "url" | "none";

export interface ClassicBannerImageSourceInfo {
  slot: ClassicBannerImageSlot;
  source: ClassicBannerImageSourceKind;
  url: string | null;
  assetId: string | null;
}

const ASSET_ID_FIELD: Record<ClassicBannerImageSlot, keyof ClassicBannerContent> = {
  background: "backgroundAssetId",
  logo: "logoAssetId",
  hero: "heroAssetId",
};

const URL_FIELD: Record<ClassicBannerImageSlot, keyof ClassicBannerContent> = {
  background: "backgroundUrl",
  logo: "logoUrl",
  hero: "heroImageUrl",
};

/** Maps classic image slots to existing BannerAsset kinds in shared storage. */
export const CLASSIC_IMAGE_SLOT_ASSET_KIND: Record<ClassicBannerImageSlot, BannerAssetKind> = {
  background: "background",
  logo: "logo",
  hero: "product",
};

export function getClassicImageAssetId(
  content: ClassicBannerContent,
  slot: ClassicBannerImageSlot,
): string | undefined {
  const value = content[ASSET_ID_FIELD[slot]];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getClassicImageUrl(
  content: ClassicBannerContent,
  slot: ClassicBannerImageSlot,
): string {
  const value = content[URL_FIELD[slot]];
  return typeof value === "string" ? value.trim() : "";
}

export function classicBannerImageSourceKind(
  content: ClassicBannerContent,
  slot: ClassicBannerImageSlot,
): ClassicBannerImageSourceKind {
  if (getClassicImageAssetId(content, slot)) return "local";
  if (getClassicImageUrl(content, slot)) return "url";
  return "none";
}

export function hasClassicBannerImageSource(
  content: ClassicBannerContent,
  slot: ClassicBannerImageSlot,
): boolean {
  return classicBannerImageSourceKind(content, slot) !== "none";
}

function loadImageElement(src: string, crossOrigin: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = "anonymous";
    }
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Resolve one classic banner image for preview — local asset first, then URL. */
export async function resolveClassicBannerImageUrl(
  content: ClassicBannerContent,
  slot: ClassicBannerImageSlot,
  assets: readonly BannerAsset[],
): Promise<ClassicBannerImageSourceInfo & { warning?: string }> {
  const assetId = getClassicImageAssetId(content, slot);
  const fallbackUrl = getClassicImageUrl(content, slot) || null;

  if (assetId) {
    const asset = assets.find((item) => item.id === assetId);
    const metaKey = asset ? assetMetaKey(asset.id, asset.size) : assetId;
    const result = await getPreviewAssetUrl(assetId, metaKey);
    if (result.ok) {
      return { slot, source: "local", url: result.value, assetId };
    }
    if (fallbackUrl) {
      return {
        slot,
        source: "url",
        url: fallbackUrl,
        assetId: null,
        warning: "Nahraný soubor nelze načíst — používá se URL.",
      };
    }
    return {
      slot,
      source: "none",
      url: null,
      assetId,
      warning: "Nahraný soubor nelze načíst.",
    };
  }

  if (fallbackUrl) {
    return { slot, source: "url", url: fallbackUrl, assetId: null };
  }

  return { slot, source: "none", url: null, assetId: null };
}

/** Resolve all classic banner image slots for preview. */
export async function resolveClassicBannerImageSources(
  content: ClassicBannerContent,
  assets: readonly BannerAsset[],
): Promise<Record<ClassicBannerImageSlot, ClassicBannerImageSourceInfo & { warning?: string }>> {
  const slots: ClassicBannerImageSlot[] = ["background", "logo", "hero"];
  const resolved = await Promise.all(
    slots.map((slot) => resolveClassicBannerImageUrl(content, slot, assets)),
  );

  return {
    background: resolved[0]!,
    logo: resolved[1]!,
    hero: resolved[2]!,
  };
}

/** Load image for canvas export — blob URLs for local assets avoid CORS taint. */
export async function loadClassicBannerImageForCanvas(
  content: ClassicBannerContent,
  slot: ClassicBannerImageSlot,
): Promise<{
  image: HTMLImageElement | null;
  source: ClassicBannerImageSourceKind;
  warning?: string;
}> {
  const assetId = getClassicImageAssetId(content, slot);
  const fallbackUrl = getClassicImageUrl(content, slot);

  if (assetId) {
    const blobResult = await getAssetBlob(assetId);
    if (blobResult.ok && blobResult.value) {
      const objectUrl = URL.createObjectURL(blobResult.value);
      try {
        const image = await loadImageElement(objectUrl, false);
        if (image) {
          return { image, source: "local" };
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }

    if (fallbackUrl) {
      const image = await loadImageElement(fallbackUrl, true);
      return {
        image,
        source: "url",
        warning: image
          ? "Nahraný soubor nelze načíst — používá se URL."
          : "Nahraný soubor ani URL se nepodařilo načíst.",
      };
    }

    return {
      image: null,
      source: "none",
      warning: "Nahraný soubor nelze načíst.",
    };
  }

  if (fallbackUrl) {
    const image = await loadImageElement(fallbackUrl, true);
    if (!image) {
      return {
        image: null,
        source: "url",
        warning: "Obrázek z URL se nepodařilo načíst.",
      };
    }
    return { image, source: "url" };
  }

  return { image: null, source: "none" };
}

export type ClassicBannerAssetUploadResult =
  | {
      ok: true;
      asset: BannerAsset;
      assets: BannerAsset[];
      contentPatch: Pick<ClassicBannerContent, "backgroundAssetId" | "logoAssetId" | "heroAssetId">;
    }
  | { ok: false; message: string };

export async function uploadClassicBannerAsset(
  file: File,
  projectId: string,
  slot: ClassicBannerImageSlot,
  currentAssets: readonly BannerAsset[],
  content: ClassicBannerContent,
): Promise<ClassicBannerAssetUploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { ok: false, message: validation.message };
  }

  try {
    const { blob, compressed } = await compressImageIfNeeded(file);
    const mimeType = compressed && blob.type ? blob.type : resolveMimeType(file);
    const dims = await readImageDimensions(blob);
    if (!dims && mimeType !== "image/svg+xml") {
      return { ok: false, message: "Obrázek se nepodařilo načíst. Zkuste jiný formát." };
    }

    const assetId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const saveResult = await saveAssetBlob(assetId, blob);
    if (!saveResult.ok) {
      return { ok: false, message: saveResult.message };
    }

    const previousAssetId = getClassicImageAssetId(content, slot);
    if (previousAssetId) {
      invalidateAssetObjectUrl(previousAssetId);
      await deleteAssetBlob(previousAssetId);
    }

    const kind = CLASSIC_IMAGE_SLOT_ASSET_KIND[slot];
    const asset: BannerAsset = {
      id: assetId,
      projectId,
      kind,
      fileName: compressed ? file.name.replace(/\.[^.]+$/, ".webp") : file.name,
      mimeType,
      size: blob.size,
      width: dims?.width ?? 100,
      height: dims?.height ?? 100,
      createdAt: new Date().toISOString(),
    };

    const withoutPrevious = currentAssets.filter(
      (item) => item.id !== previousAssetId && !(item.kind === kind && kind !== "decoration"),
    );
    const assets = [...withoutPrevious, asset];
    const contentPatch = {
      [ASSET_ID_FIELD[slot]]: assetId,
    } as Pick<ClassicBannerContent, "backgroundAssetId" | "logoAssetId" | "heroAssetId">;

    return { ok: true, asset, assets, contentPatch };
  } catch {
    return { ok: false, message: "Nahrání selhalo." };
  }
}

export async function clearClassicBannerAsset(
  slot: ClassicBannerImageSlot,
  currentAssets: readonly BannerAsset[],
  content: ClassicBannerContent,
): Promise<{
  assets: BannerAsset[];
  contentPatch: Pick<ClassicBannerContent, "backgroundAssetId" | "logoAssetId" | "heroAssetId">;
}> {
  const assetId = getClassicImageAssetId(content, slot);
  if (assetId) {
    invalidateAssetObjectUrl(assetId);
    await deleteAssetBlob(assetId);
  }

  const assets = assetId
    ? currentAssets.filter((item) => item.id !== assetId)
    : [...currentAssets];

  const contentPatch = {
    [ASSET_ID_FIELD[slot]]: undefined,
  } as Pick<ClassicBannerContent, "backgroundAssetId" | "logoAssetId" | "heroAssetId">;

  return { assets, contentPatch };
}
