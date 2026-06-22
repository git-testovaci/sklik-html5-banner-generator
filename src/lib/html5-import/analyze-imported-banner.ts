import JSZip from "jszip";
import { BANNER_SIZES } from "@/lib/banner-sizes";
import type { ValidationRow } from "@/types/validation";
import type {
  ImportedBannerAnalysis,
  ImportedFileKind,
  ImportedZipFileEntry,
} from "@/types/imported-banner";
import { analyzeAnimations } from "./imported-banner-animations";
import { buildSandboxPreview } from "./imported-banner-preview";
import {
  classifyExternal,
  detectForbiddenJs,
  extractExternalSources,
  isNestedZipPath,
  isVideoPath,
} from "./imported-banner-security";
import {
  extractAdSize,
  extractCta,
  extractHeadlines,
  extractTitle,
  inferSizeFromCss,
  stripHtml,
} from "./imported-banner-text";

const MAX_FILES = 40;
const MAX_DEPTH = 2;
const MAX_UNCOMPRESSED = 256_000;
const SKLIK_ZIP_LIMIT = 256_000;

function fileKind(path: string): ImportedFileKind {
  const e = path.split(".").pop()?.toLowerCase() ?? "";
  if (e === "html" || e === "htm") return "html";
  if (e === "css") return "css";
  if (e === "js") return "js";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "avif"].includes(e)) return "image";
  if (["woff", "woff2", "ttf", "eot"].includes(e)) return "font";
  if (["mp4", "webm", "mov", "avi"].includes(e)) return "video";
  if (e === "zip") return "zip";
  return "other";
}

function depth(path: string): number {
  return path.split("/").filter(Boolean).length - 1;
}

function pickHtml(paths: string[]): string | null {
  const htmls = paths.filter((p) => fileKind(p) === "html");
  if (htmls.length === 0) return null;
  const index = htmls.find((p) => /index\.html?$/i.test(p));
  if (index) return index;
  if (htmls.length === 1) return htmls[0];
  return htmls[0];
}

function decodeText(data: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(data);
  } catch {
    return "";
  }
}

function nearestAllowedSize(w: number, h: number): { width: number; height: number } {
  let best = BANNER_SIZES[0];
  let diff = Infinity;
  for (const s of BANNER_SIZES) {
    const d = Math.abs(s.width - w) + Math.abs(s.height - h);
    if (d < diff) {
      diff = d;
      best = s;
    }
  }
  return { width: best.width, height: best.height };
}

function buildValidationRows(input: {
  compressedSize: number;
  uncompressedSize: number;
  fileCount: number;
  htmlCount: number;
  hasNestedZip: boolean;
  maxDepth: number;
  hasVideo: boolean;
  forbiddenJs: string[];
  externalSources: string[];
  dimensions: ImportedBannerAnalysis["dimensions"];
  assetResolutionRate: number;
  unresolvedCount: number;
}): ValidationRow[] {
  const rows: ValidationRow[] = [
    {
      id: "zip-size",
      label: "ZIP size",
      value: `${Math.round(input.compressedSize / 1024)} kB (limit 250 kB)`,
      status:
        input.compressedSize <= SKLIK_ZIP_LIMIT
          ? "pass"
          : input.compressedSize <= SKLIK_ZIP_LIMIT * 1.2
            ? "warn"
            : "fail",
    },
    {
      id: "uncompressed",
      label: "Uncompressed size",
      value: `${Math.round(input.uncompressedSize / 1024)} kB`,
      status: input.uncompressedSize <= MAX_UNCOMPRESSED ? "pass" : "fail",
    },
    {
      id: "file-count",
      label: "File count",
      value: `${input.fileCount} / ${MAX_FILES}`,
      status: input.fileCount <= MAX_FILES ? "pass" : "fail",
    },
    {
      id: "html-count",
      label: "HTML files",
      value: `${input.htmlCount}`,
      status: input.htmlCount === 1 ? "pass" : input.htmlCount === 0 ? "fail" : "warn",
    },
    {
      id: "nested-zip",
      label: "Nested ZIP",
      value: input.hasNestedZip ? "Detected" : "None",
      status: input.hasNestedZip ? "fail" : "pass",
    },
    {
      id: "depth",
      label: "Directory depth",
      value: `${input.maxDepth} / ${MAX_DEPTH}`,
      status: input.maxDepth <= MAX_DEPTH ? "pass" : "fail",
    },
    {
      id: "video",
      label: "Video files",
      value: input.hasVideo ? "Detected" : "None",
      status: input.hasVideo ? "fail" : "pass",
    },
    {
      id: "forbidden-js",
      label: "Forbidden JS",
      value: input.forbiddenJs.length ? input.forbiddenJs.join(", ") : "None detected",
      status: input.forbiddenJs.length ? "fail" : "pass",
    },
    {
      id: "external",
      label: "External sources",
      value: input.externalSources.length
        ? `${input.externalSources.length} found`
        : "None",
      status: input.externalSources.some((u) => classifyExternal(u) === "fail")
        ? "fail"
        : input.externalSources.length
          ? "pending"
          : "pass",
    },
    {
      id: "dimensions",
      label: "Detected dimensions",
      value: input.dimensions
        ? `${input.dimensions.width}×${input.dimensions.height} (${input.dimensions.source})`
        : "Size not detected",
      status: input.dimensions ? "pass" : "warn",
    },
    {
      id: "assets",
      label: "Asset resolution",
      value: `${input.assetResolutionRate}%${input.unresolvedCount ? ` · ${input.unresolvedCount} unresolved` : ""}`,
      status:
        input.assetResolutionRate >= 80
          ? "pass"
          : input.assetResolutionRate >= 50
            ? "warn"
            : "info",
    },
    {
      id: "sklik",
      label: "Sklik readiness",
      value: "Estimate only — export not implemented",
      status: "info",
    },
  ];
  return rows;
}

export async function analyzeImportedBannerZip(
  file: File,
): Promise<ImportedBannerAnalysis> {
  const id = `import-${Date.now()}`;

  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("Please upload a .zip file.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error("Could not read ZIP file.");
  }

  const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
  if (paths.length === 0) {
    throw new Error("ZIP is empty.");
  }

  const filesMap = new Map<string, Uint8Array>();
  const entries: ImportedZipFileEntry[] = [];
  let uncompressedSize = 0;
  let hasNestedZip = false;
  let hasVideo = false;
  let maxDepth = 0;

  for (const path of paths) {
    const entry = zip.files[path];
    const data = await entry.async("uint8array");
    filesMap.set(path, data);
    uncompressedSize += data.byteLength;
    maxDepth = Math.max(maxDepth, depth(path));
    if (isNestedZipPath(path)) hasNestedZip = true;
    if (isVideoPath(path)) hasVideo = true;

    const kind = fileKind(path);
    const item: ImportedZipFileEntry = {
      path,
      name: path.split("/").pop() ?? path,
      size: data.byteLength,
      kind,
    };
    if (kind === "video") item.warning = "Video not allowed for Sklik";
    if (kind === "zip") item.warning = "Nested ZIP not allowed";
    entries.push(item);
  }

  const htmlPaths = paths.filter((p) => fileKind(p) === "html");
  const primaryHtmlPath = pickHtml(paths);
  const cssTexts: string[] = [];
  const jsTexts: string[] = [];
  const inspectTexts: string[] = [];

  for (const [path, data] of filesMap) {
    const kind = fileKind(path);
    const text = decodeText(data);
    if (!text) continue;
    if (kind === "css") cssTexts.push(text);
    if (kind === "js") jsTexts.push(text);
    if (kind === "html" || kind === "css" || kind === "js") inspectTexts.push(text);
  }

  let htmlContent = "";
  if (primaryHtmlPath) {
    htmlContent = decodeText(filesMap.get(primaryHtmlPath) ?? new Uint8Array());
    inspectTexts.push(htmlContent);
  }

  const { found: hasForbiddenJs, matches: forbiddenJsMatches } =
    detectForbiddenJs(inspectTexts);
  const externalSources = extractExternalSources(inspectTexts);

  let dimensions: ImportedBannerAnalysis["dimensions"] = null;
  if (htmlContent) {
    const meta = extractAdSize(htmlContent);
    if (meta) {
      dimensions = { ...meta, source: "meta" };
    } else {
      const cssSize = inferSizeFromCss(cssTexts);
      if (cssSize) dimensions = { ...cssSize, source: "css" };
    }
  }

  const plain = htmlContent ? stripHtml(htmlContent) : "";
  const { headline, subheadline } = extractHeadlines(plain);
  const animationInsights = analyzeAnimations(cssTexts, jsTexts);

  let previewHtml: string | null = null;
  let previewWarning: string | null = null;
  let unresolvedAssets: string[] = [];
  let assetResolutionRate = 0;
  const previewBlobUrls: string[] = [];

  if (primaryHtmlPath && htmlContent) {
    try {
      const preview = buildSandboxPreview(primaryHtmlPath, htmlContent, filesMap);
      previewHtml = preview.html;
      previewBlobUrls.push(...preview.blobUrls);
      unresolvedAssets = preview.unresolved;
      assetResolutionRate = preview.resolutionRate;
      if (preview.unresolved.length > 0) {
        previewWarning = `${preview.unresolved.length} asset reference(s) could not be resolved locally.`;
      }
    } catch {
      previewWarning = "Preview could not be built safely.";
    }
  } else {
    previewWarning = "No HTML file found for preview.";
  }

  const validationRows = buildValidationRows({
    compressedSize: file.size,
    uncompressedSize,
    fileCount: paths.length,
    htmlCount: htmlPaths.length,
    hasNestedZip,
    maxDepth,
    hasVideo,
    forbiddenJs: forbiddenJsMatches,
    externalSources,
    dimensions,
    assetResolutionRate,
    unresolvedCount: unresolvedAssets.length,
  });

  const hasFail = validationRows.some((r) => r.status === "fail");
  const hasWarn = validationRows.some((r) => r.status === "warn");
  const overallStatus = hasFail ? "fail" : hasWarn ? "warn" : "pass";
  const sklikReadiness = hasFail ? "not-ready" : hasWarn ? "review" : "ready";

  return {
    id,
    fileName: file.name,
    compressedSize: file.size,
    uncompressedSize,
    fileCount: paths.length,
    directoryDepth: maxDepth,
    htmlFileCount: htmlPaths.length,
    primaryHtmlPath,
    hasNestedZip,
    hasVideo,
    hasForbiddenJs,
    forbiddenJsMatches,
    externalSources,
    dimensions,
    files: entries.sort((a, b) => a.path.localeCompare(b.path)),
    validationRows,
    overallStatus,
    sklikReadiness,
    extractedText: {
      title: htmlContent ? extractTitle(htmlContent) : null,
      headline,
      subheadline,
      cta: htmlContent ? extractCta(htmlContent, plain) : null,
      plainTextPreview: plain.slice(0, 280),
    },
    animationInsights,
    previewHtml,
    previewBlobUrls,
    previewWarning,
    unresolvedAssets,
    assetResolutionRate,
    analyzedAt: new Date().toISOString(),
  };
}

export function getDefaultImportProjectValues(
  analysis: ImportedBannerAnalysis,
): {
  name: string;
  width: number;
  height: number;
  headline: string;
  subheadline: string;
  cta: string;
  animation: ImportedBannerAnalysis["animationInsights"]["suggestedAnimation"];
} {
  const baseName = analysis.fileName.replace(/\.zip$/i, "") || "Imported banner";
  const size = analysis.dimensions
    ? nearestAllowedSize(analysis.dimensions.width, analysis.dimensions.height)
    : { width: 300, height: 250 };

  return {
    name: analysis.extractedText.title ?? baseName,
    width: size.width,
    height: size.height,
    headline: analysis.extractedText.headline ?? "Imported headline",
    subheadline: analysis.extractedText.subheadline ?? "",
    cta: analysis.extractedText.cta ?? "Learn more",
    animation: analysis.animationInsights.suggestedAnimation,
  };
}
