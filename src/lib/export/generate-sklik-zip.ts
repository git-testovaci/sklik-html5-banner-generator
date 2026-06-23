import JSZip from "jszip";
import { collectExportAssets } from "@/lib/assets/asset-export";
import type { BannerEditorState } from "@/types/editor";
import type {
  GeneratedBannerBundle,
  GeneratedBannerFile,
  SklikZipExportResult,
} from "@/types/export";
import { createExportFileName } from "./export-filenames";
import { validateExport } from "./export-validation";
import { generateBannerCss } from "./generate-banner-css";
import { generateBannerHtml } from "./generate-banner-html";
import { generateBannerJs } from "./generate-banner-js";

function byteSize(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export async function buildGeneratedBannerBundle(
  state: BannerEditorState,
): Promise<{
  bundle: GeneratedBannerBundle;
  assetErrors: string[];
  assetWarnings: string[];
  assetFiles: Awaited<ReturnType<typeof collectExportAssets>>["files"];
}> {
  const assetResult = await collectExportAssets(state);
  const indexHtml = generateBannerHtml(state, assetResult.files);
  const styleCss = generateBannerCss(state);
  const scriptJs = generateBannerJs();

  const files: GeneratedBannerFile[] = [
    { path: "index.html", size: byteSize(indexHtml), kind: "html" },
    { path: "style.css", size: byteSize(styleCss), kind: "css" },
    { path: "script.js", size: byteSize(scriptJs), kind: "js" },
    ...assetResult.generatedFiles,
  ];

  return {
    bundle: { indexHtml, styleCss, scriptJs, files },
    assetErrors: assetResult.errors,
    assetWarnings: assetResult.warnings,
    assetFiles: assetResult.files,
  };
}

export async function generateSklikZip(
  state: BannerEditorState,
): Promise<SklikZipExportResult> {
  const { bundle, assetErrors, assetWarnings, assetFiles } =
    await buildGeneratedBannerBundle(state);
  const fileName = createExportFileName(state);

  if (assetErrors.length > 0) {
    const validationReport = validateExport({
      state,
      indexHtml: bundle.indexHtml,
      styleCss: bundle.styleCss,
      scriptJs: bundle.scriptJs,
      zipSize: 0,
      fileName,
      assetErrors,
      assetWarnings,
      fileCount: bundle.files.length,
    });
    return {
      zipBlob: new Blob([], { type: "application/zip" }),
      fileName,
      zipSize: 0,
      fileCount: bundle.files.length,
      validationReport,
      generatedFiles: bundle.files,
    };
  }

  const zip = new JSZip();
  zip.file("index.html", bundle.indexHtml);
  zip.file("style.css", bundle.styleCss);
  zip.file("script.js", bundle.scriptJs);

  for (const asset of assetFiles) {
    zip.file(asset.path, asset.blob);
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  const validationReport = validateExport({
    state,
    indexHtml: bundle.indexHtml,
    styleCss: bundle.styleCss,
    scriptJs: bundle.scriptJs,
    zipSize: zipBlob.size,
    fileName,
    assetErrors: [],
    assetWarnings,
    fileCount: bundle.files.length,
  });

  return {
    zipBlob,
    fileName,
    zipSize: zipBlob.size,
    fileCount: bundle.files.length,
    validationReport,
    generatedFiles: bundle.files,
  };
}
