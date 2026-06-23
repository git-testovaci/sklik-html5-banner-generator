import type { ValidationRowStatus } from "./validation";

export interface GeneratedBannerFile {
  path: string;
  size: number;
  kind: "html" | "css" | "js" | "image";
}

export interface GeneratedBannerBundle {
  indexHtml: string;
  styleCss: string;
  scriptJs: string;
  files: GeneratedBannerFile[];
}

export type ExportValidationStatus = ValidationRowStatus;

export interface ExportValidationRow {
  id: string;
  label: string;
  status: ExportValidationStatus;
  message: string;
  detail?: string;
}

export interface ExportValidationReport {
  rows: ExportValidationRow[];
  summaryStatus: "pass" | "warn" | "fail";
  recommendations: string[];
}

export interface SklikZipExportResult {
  zipBlob: Blob;
  fileName: string;
  zipSize: number;
  fileCount: number;
  validationReport: ExportValidationReport;
  generatedFiles: GeneratedBannerFile[];
}
