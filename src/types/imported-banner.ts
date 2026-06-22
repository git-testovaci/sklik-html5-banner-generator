import type { BannerAnimation } from "./editor";
import type { ValidationRow } from "./validation";

export type ImportedFileKind =
  | "html"
  | "css"
  | "js"
  | "image"
  | "font"
  | "video"
  | "other"
  | "zip";

export interface ImportedZipFileEntry {
  path: string;
  name: string;
  size: number;
  kind: ImportedFileKind;
  warning?: string;
}

export interface DetectedDimensions {
  width: number;
  height: number;
  source: "meta" | "css" | "unknown";
}

export interface ExtractedTextMetadata {
  title: string | null;
  headline: string | null;
  subheadline: string | null;
  cta: string | null;
  plainTextPreview: string;
}

export type AnimationComplexity = "low" | "medium" | "high";
export type RecreateCapability = "yes" | "partial" | "no";

export interface AnimationInsights {
  keyframeNames: string[];
  animationNames: string[];
  durations: string[];
  hasTransitions: boolean;
  hasRequestAnimationFrame: boolean;
  hasTimers: boolean;
  hasClassListManipulation: boolean;
  timelineHints: string[];
  complexity: AnimationComplexity;
  recreateCapability: RecreateCapability;
  suggestedAnimation: BannerAnimation;
  inspirationNotes: string[];
}

export interface ImportedBannerAnalysis {
  id: string;
  fileName: string;
  compressedSize: number;
  uncompressedSize: number;
  fileCount: number;
  directoryDepth: number;
  htmlFileCount: number;
  primaryHtmlPath: string | null;
  hasNestedZip: boolean;
  hasVideo: boolean;
  hasForbiddenJs: boolean;
  forbiddenJsMatches: string[];
  externalSources: string[];
  dimensions: DetectedDimensions | null;
  files: ImportedZipFileEntry[];
  validationRows: ValidationRow[];
  overallStatus: "pass" | "warn" | "fail";
  sklikReadiness: "ready" | "review" | "not-ready";
  extractedText: ExtractedTextMetadata;
  animationInsights: AnimationInsights;
  previewHtml: string | null;
  previewBlobUrls: string[];
  previewWarning: string | null;
  unresolvedAssets: string[];
  assetResolutionRate: number;
  analyzedAt: string;
}

export interface ImportedBannerSession {
  analysis: ImportedBannerAnalysis;
  previewBlobUrls: string[];
}

export interface CreateProjectFromImportInput {
  name: string;
  width: number;
  height: number;
  headline: string;
  subheadline: string;
  cta: string;
  animation: BannerAnimation;
}
