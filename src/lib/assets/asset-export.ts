import { getAssetBlob } from "@/lib/assets/asset-storage";
import {
  isExportableImageMime,
  isVideoMimeType,
  sanitizeAssetFileName,
} from "@/lib/assets/asset-validation";
import {
  collectUsedExportAssetIds,
  findVideoAssets,
} from "@/lib/export/export-layer-utils";
import type { BannerEditorState } from "@/types/editor";
import type { GeneratedBannerFile } from "@/types/export";

export interface ExportAssetFile {
  path: string;
  blob: Blob;
  assetId: string;
  size: number;
}

export interface CollectExportAssetsResult {
  files: ExportAssetFile[];
  generatedFiles: GeneratedBannerFile[];
  errors: string[];
  warnings: string[];
}

export async function collectExportAssets(
  state: BannerEditorState,
): Promise<CollectExportAssetsResult> {
  const files: ExportAssetFile[] = [];
  const generatedFiles: GeneratedBannerFile[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const usedNames = new Set<string>();

  for (const video of findVideoAssets(state)) {
    errors.push(
      `Video není pro Sklik HTML5 ZIP podporované: ${video.fileName}. Použijte obrázek nebo animaci z vrstev.`,
    );
  }

  const usedAssetIds = collectUsedExportAssetIds(state);

  for (const assetId of usedAssetIds) {
    const asset = (state.assets ?? []).find((a) => a.id === assetId);

    if (!asset) {
      errors.push(`Chybí metadata assetu pro export (${assetId}).`);
      continue;
    }

    if (isVideoMimeType(asset.mimeType)) {
      errors.push(
        `Video není pro Sklik HTML5 ZIP podporované. Použijte obrázek nebo animaci z vrstev (${asset.fileName}).`,
      );
      continue;
    }

    if (!isExportableImageMime(asset.mimeType)) {
      errors.push(
        `Nepodporovaný typ souboru ${asset.fileName}: ${asset.mimeType}. Použijte PNG, JPEG, WebP, GIF, SVG nebo AVIF.`,
      );
      continue;
    }

    if (asset.size > 200_000) {
      errors.push(
        `${asset.fileName} překračuje 200 kB — zkomprimujte před exportem.`,
      );
      continue;
    }

    const blobResult = await getAssetBlob(assetId);
    if (!blobResult.ok) {
      errors.push(`Nelze načíst ${asset.fileName}: ${blobResult.message}`);
      continue;
    }
    if (!blobResult.value) {
      errors.push(`Chybí soubor obrázku pro viditelný asset „${asset.fileName}".`);
      continue;
    }

    let fileName = sanitizeAssetFileName(asset.fileName);
    if (usedNames.has(fileName)) {
      fileName = `${asset.kind}-${fileName}`;
    }
    usedNames.add(fileName);

    const path = `assets/${fileName}`;
    const size = blobResult.value.size;

    files.push({ path, blob: blobResult.value, assetId, size });
    generatedFiles.push({ path, size, kind: "image" });
  }

  const instanceCount = [...usedAssetIds].reduce((sum, id) => {
    return sum + (state.bannerLayers ?? []).filter((l) => l.visible && l.assetId === id).length;
  }, 0);
  const uniqueFiles = files.length;
  if (instanceCount > uniqueFiles && uniqueFiles > 0) {
    warnings.push(
      `${instanceCount} vrstev sdílí ${uniqueFiles} souborů v assets/ — duplicitní soubory nejsou v ZIP.`,
    );
  }

  const totalAssetSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalAssetSize > 180_000) {
    warnings.push("Assety jsou velké — ZIP může překročit limit Sklik 250 kB.");
  }

  return { files, generatedFiles, errors, warnings };
}

export function assetExportPathForAsset(
  _state: BannerEditorState,
  assetId: string,
  exportFiles: ExportAssetFile[],
): string | null {
  const match = exportFiles.find((f) => f.assetId === assetId);
  return match?.path ?? null;
}
