import type { BannerEditorState } from "@/types/editor";
import type {
  ExportValidationReport,
  ExportValidationRow,
} from "@/types/export";

const MAX_ZIP_SIZE = 256_000;
const MAX_FILES = 40;
const MAX_DEPTH = 2;

const ALLOWED_EXT = new Set([
  "html", "htm", "css", "js", "gif", "png", "jpg", "jpeg", "svg",
  "woff", "woff2", "ttf", "eot", "json", "txt", "xml", "webp", "avif",
]);

const FORBIDDEN_JS = [
  { pattern: /window\.open\s*\(/i, label: "window.open()" },
  { pattern: /Enabler\.exit\s*\(/i, label: "Enabler.exit()" },
  { pattern: /mraid\.open\s*\(/i, label: "mraid.open()" },
];

const DANGEROUS_JS = [
  { pattern: /\beval\s*\(/i, label: "eval()" },
  { pattern: /new\s+Function\s*\(/i, label: "new Function()" },
  { pattern: /document\.write\s*\(/i, label: "document.write()" },
];

const EXTERNAL_PATTERNS = [
  /https?:\/\//i,
  /\/\//,
  /@import/i,
  /url\s*\(\s*['"]?https?:/i,
];

function row(
  id: string,
  label: string,
  status: ExportValidationRow["status"],
  message: string,
  detail?: string,
): ExportValidationRow {
  return { id, label, status, message, detail };
}

function summarize(rows: ExportValidationRow[]): ExportValidationReport["summaryStatus"] {
  if (rows.some((r) => r.status === "fail")) return "fail";
  if (rows.some((r) => r.status === "warn")) return "warn";
  return "pass";
}

function scanForbidden(content: string, rules: typeof FORBIDDEN_JS): string[] {
  const found: string[] = [];
  for (const { pattern, label } of rules) {
    if (pattern.test(content)) found.push(label);
  }
  return found;
}

export interface ValidateExportInput {
  state: BannerEditorState;
  indexHtml: string;
  styleCss: string;
  scriptJs: string;
  zipSize: number;
  fileName: string;
}

export function validateExport(input: ValidateExportInput): ExportValidationReport {
  const { state, indexHtml, styleCss, scriptJs, zipSize } = input;
  const allText = `${indexHtml}\n${styleCss}\n${scriptJs}`;
  const rows: ExportValidationRow[] = [];

  rows.push(
    row(
      "html-count",
      "HTML file count",
      "pass",
      "Exactly 1 HTML file (index.html)",
    ),
  );

  const zipSizeKb = Math.round(zipSize / 1024);
  const zipSizeStatus =
    zipSize > MAX_ZIP_SIZE ? "fail" : zipSize > 200_000 ? "warn" : "pass";
  const zipSizeMessage =
    zipSize > MAX_ZIP_SIZE
      ? `${zipSizeKb} kB — exceeds 250 kB Sklik limit`
      : zipSize > 200_000
        ? `${zipSizeKb} kB — approaching 250 kB limit`
        : `${zipSizeKb} kB (limit 250 kB)`;

  rows.push(row("zip-size", "ZIP size", zipSizeStatus, zipSizeMessage));

  rows.push(
    row(
      "file-count",
      "File count",
      3 <= MAX_FILES ? "pass" : "fail",
      "3 / 40",
    ),
  );

  rows.push(row("nested-zip", "Nested ZIP", "pass", "None"));

  rows.push(row("video", "Video files", "pass", "None"));

  rows.push(
    row(
      "depth",
      "Directory depth",
      "pass",
      `0 / ${MAX_DEPTH} (flat structure)`,
    ),
  );

  const extensions = ["html", "css", "js"];
  const allowed = extensions.every((ext) => ALLOWED_EXT.has(ext));
  rows.push(
    row(
      "file-types",
      "Allowed file types",
      allowed ? "pass" : "fail",
      "html, css, js",
    ),
  );

  const hasAdSize = /<meta[^>]+name=["']ad\.size["'][^>]+content=["']width=\d+,height=\d+["']/i.test(
    indexHtml,
  );
  rows.push(
    row(
      "ad-size-meta",
      "Meta ad.size",
      hasAdSize ? "pass" : "fail",
      hasAdSize ? "Present in index.html" : "Missing meta ad.size",
    ),
  );

  const sizeMatch =
    indexHtml.includes(`width=${state.width},height=${state.height}`) &&
    styleCss.includes(`width: ${state.width}px`) &&
    styleCss.includes(`height: ${state.height}px`);
  rows.push(
    row(
      "dimensions",
      "Banner dimensions",
      sizeMatch ? "pass" : "fail",
      `${state.width}×${state.height}`,
    ),
  );

  const forbidden = scanForbidden(allText, FORBIDDEN_JS);
  rows.push(
    row(
      "forbidden-js",
      "Forbidden JS",
      forbidden.length ? "fail" : "pass",
      forbidden.length ? forbidden.join(", ") : "None detected",
    ),
  );

  const dangerous = scanForbidden(allText, DANGEROUS_JS);
  rows.push(
    row(
      "dangerous-js",
      "Dangerous JS",
      dangerous.length ? "fail" : "pass",
      dangerous.length ? dangerous.join(", ") : "None detected",
    ),
  );

  const externalHits = EXTERNAL_PATTERNS.filter((p) => p.test(allText));
  rows.push(
    row(
      "external",
      "External resources",
      externalHits.length ? "fail" : "pass",
      externalHits.length ? "External URLs or imports detected" : "None",
    ),
  );

  const formHits = [/<form/i, /<input/i, /<select/i, /<textarea/i].filter((p) =>
    p.test(indexHtml),
  );
  rows.push(
    row(
      "forms",
      "Forms",
      formHits.length ? "fail" : "pass",
      formHits.length ? "Form elements detected" : "None",
    ),
  );

  rows.push(
    row(
      "video-tags",
      "Video tags",
      /<video/i.test(indexHtml) ? "fail" : "pass",
      /<video/i.test(indexHtml) ? "<video> detected" : "None",
    ),
  );

  if (/<a\s[^>]*href\s*=/i.test(indexHtml)) {
    rows.push(
      row(
        "target-links",
        "Target links",
        "warn",
        "Anchor href found — Sklik uses ad-level click URL",
      ),
    );
  }

  const summaryStatus = summarize(rows);

  return {
    rows,
    summaryStatus,
    recommendations: [
      "Keep the exported ZIP under 250 kB for Sklik single-banner upload.",
      "Verify final banner size in Sklik after upload.",
      "Click URL is configured in Sklik ad settings, not inside the banner HTML.",
    ],
  };
}
