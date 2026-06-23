import { getAssetBlob } from "@/lib/assets/asset-storage";
import {
  sanitizeAssetFileName,
  validateAssetForExport,
} from "@/lib/assets/asset-validation";
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

  const visiblePlacements = (state.assetPlacements ?? []).filter((p) => p.visible);
  const usedAssetIds = new Set(visiblePlacements.map((p) => p.assetId));

  for (const assetId of usedAssetIds) {
    const asset = (state.assets ?? []).find((a) => a.id === assetId);
    const placement = visiblePlacements.find((p) => p.assetId === assetId);

    if (!asset) {
      if (placement) {
        errors.push(`Missing asset metadata for visible layer (${assetId}).`);
      }
      continue;
    }

    const validation = validateAssetForExport(asset);
    if (!validation.ok) {
      errors.push(validation.message);
      continue;
    }

    const blobResult = await getAssetBlob(assetId);
    if (!blobResult.ok) {
      errors.push(`Could not read ${asset.fileName}: ${blobResult.message}`);
      continue;
    }
    if (!blobResult.value) {
      errors.push(`Missing image blob for visible asset "${asset.fileName}".`);
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

  const totalAssetSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalAssetSize > 180_000) {
    warnings.push("Asset files are large — ZIP may exceed 250 kB Sklik limit.");
  }

  return { files, generatedFiles, errors, warnings };
}

export function assetExportPathForAsset(
  state: BannerEditorState,
  assetId: string,
  exportFiles: ExportAssetFile[],
): string | null {
  const match = exportFiles.find((f) => f.assetId === assetId);
  return match?.path ?? null;
}
