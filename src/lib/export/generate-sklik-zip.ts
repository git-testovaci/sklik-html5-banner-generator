import JSZip from "jszip";
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

export function buildGeneratedBannerBundle(
  state: BannerEditorState,
): GeneratedBannerBundle {
  const indexHtml = generateBannerHtml(state);
  const styleCss = generateBannerCss(state);
  const scriptJs = generateBannerJs();

  const files: GeneratedBannerFile[] = [
    { path: "index.html", size: byteSize(indexHtml), kind: "html" },
    { path: "style.css", size: byteSize(styleCss), kind: "css" },
    { path: "script.js", size: byteSize(scriptJs), kind: "js" },
  ];

  return { indexHtml, styleCss, scriptJs, files };
}

export async function generateSklikZip(
  state: BannerEditorState,
): Promise<SklikZipExportResult> {
  const bundle = buildGeneratedBannerBundle(state);
  const fileName = createExportFileName(state);

  const zip = new JSZip();
  zip.file("index.html", bundle.indexHtml);
  zip.file("style.css", bundle.styleCss);
  zip.file("script.js", bundle.scriptJs);

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
