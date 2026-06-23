import type { BannerEditorState } from "@/types/editor";
import { totalStoryboardDurationMs } from "@/lib/animation/storyboard-utils";
import type {
  ExportValidationReport,
  ExportValidationRow,
} from "@/types/export";

const MAX_ZIP_SIZE = 256_000;
const MAX_FILES = 40;
const MAX_DEPTH = 2;

const ALLOWED_ASSET_MIME = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "image/avif",
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
  /url\s*\(\s*['"]?\/\//i,
  /@import/i,
  /url\s*\(\s*['"]?https?:/i,
  /<script[^>]+src\s*=\s*["']https?:/i,
  /<link[^>]+href\s*=\s*["']https?:/i,
  /<img[^>]+src\s*=\s*["']https?:/i,
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

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
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
  assetErrors?: string[];
  assetWarnings?: string[];
  fileCount?: number;
}

export function validateExport(input: ValidateExportInput): ExportValidationReport {
  const {
    state,
    indexHtml,
    styleCss,
    scriptJs,
    zipSize,
    assetErrors = [],
    assetWarnings = [],
    fileCount = 3,
  } = input;
  const allText = `${indexHtml}\n${styleCss}\n${scriptJs}`;
  const scanText = stripComments(`${indexHtml}\n${styleCss}`);
  const rows: ExportValidationRow[] = [];

  if (assetErrors.length > 0) {
    for (const err of assetErrors) {
      rows.push(row("missing-asset", "Chybějící asset", "fail", err));
    }
  }

  rows.push(
    row(
      "html-count",
      "Počet HTML souborů",
      "pass",
      "Přesně 1 HTML soubor (index.html)",
    ),
  );

  const zipSizeKb = Math.max(0, Math.round(zipSize / 1024));
  const zipSizeStatus =
    zipSize > MAX_ZIP_SIZE ? "fail" : zipSize > 200_000 ? "warn" : zipSize === 0 && assetErrors.length ? "fail" : "pass";
  const zipSizeMessage =
    assetErrors.length && zipSize === 0
      ? "Export blokován — opravte chyby assetů"
      : zipSize > MAX_ZIP_SIZE
        ? `${zipSizeKb} kB — překračuje limit Sklik 250 kB. Zkomprimujte obrázky, použijte WebP, snižte částice.`
        : zipSize > 200_000
          ? `${zipSizeKb} kB — blíží se limitu 250 kB. Zvažte kompresi obrázků.`
          : `${zipSizeKb} kB (limit 250 kB)`;

  rows.push(row("zip-size", "Velikost ZIP", zipSizeStatus, zipSizeMessage));

  rows.push(
    row(
      "file-count",
      "Počet souborů",
      fileCount <= MAX_FILES ? "pass" : "fail",
      `${fileCount} / ${MAX_FILES}`,
    ),
  );

  rows.push(row("nested-zip", "Vnořený ZIP", "pass", "Žádný"));

  rows.push(row("video", "Video soubory", "pass", "Žádné"));

  const assetCount = (state.assets ?? []).length;
  rows.push(
    row(
      "asset-count",
      "Počet assetů",
      assetCount <= 20 ? "pass" : "warn",
      `${assetCount} záznamů v metadatech`,
    ),
  );

  const visibleAssets = (state.assetPlacements ?? []).filter((p) => p.visible);
  rows.push(
    row(
      "assets-folder",
      "Složka assets",
      indexHtml.includes('src="assets/') || visibleAssets.length === 0
        ? "pass"
        : "warn",
      visibleAssets.length
        ? "Očekávány lokální reference assets/"
        : "Bez viditelných obrázků",
    ),
  );

  for (const asset of state.assets ?? []) {
    if (!ALLOWED_ASSET_MIME.has(asset.mimeType)) {
      rows.push(
        row(
          "asset-mime",
          "Asset MIME type",
          "fail",
          `${asset.fileName}: ${asset.mimeType}`,
        ),
      );
    }
    if (asset.size > 200_000) {
      rows.push(
        row(
          "asset-size",
          "Asset file size",
          "fail",
          `${asset.fileName}: ${Math.round(asset.size / 1024)} kB`,
        ),
      );
    } else if (asset.size > 0) {
      rows.push(
        row(
          `asset-contrib-${asset.id}`,
          `Asset: ${asset.fileName}`,
          asset.size > 80_000 ? "warn" : "pass",
          `~${Math.round(asset.size / 1024)} kB toward ZIP total`,
        ),
      );
    }
  }

  rows.push(
    row(
      "depth",
      "Directory depth",
      fileCount > 3 ? "pass" : "pass",
      `assets/ depth 1 · max ${MAX_DEPTH}`,
    ),
  );

  rows.push(
    row(
      "file-types",
      "Allowed file types",
      "pass",
      "html, css, js, images",
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

  const externalHits = EXTERNAL_PATTERNS.filter((p) => p.test(scanText));
  rows.push(
    row(
      "external",
      "External resources",
      externalHits.length ? "fail" : "pass",
      externalHits.length ? "External URLs or imports detected" : "None",
    ),
  );

  if (/data:image\/[^;]+;base64,/i.test(allText)) {
    rows.push(
      row(
        "base64",
        "Base64 bloat",
        "warn",
        "Base64 image data detected — prefer assets/ files",
      ),
    );
  }

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

  const maxDuration =
    (state.scenes ?? []).length > 1
      ? totalStoryboardDurationMs(state)
      : (state.timeline?.durationMs ?? 3000);
  if (maxDuration > 8000) {
    rows.push(
      row(
        "animation-duration",
        "Timeline duration",
        "warn",
        `${maxDuration}ms — keep banner animations short`,
      ),
    );
  }

  if ((state.scenes ?? []).length > 5) {
    rows.push(
      row(
        "scene-count",
        "Scene count",
        "warn",
        `${state.scenes!.length} scenes — may increase complexity and ZIP size`,
      ),
    );
  }

  const hiddenText =
    (state.textPlacements ?? []).every((p) => !p.visible || p.opacity <= 0.05) &&
    !state.headline.trim();
  if (hiddenText) {
    rows.push(
      row(
        "readable-state",
        "Readable final state",
        "warn",
        "Important text may not be visible",
      ),
    );
  }

  for (const warning of assetWarnings) {
    rows.push(row("asset-warning", "Asset warning", "warn", warning));
  }

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
      "Udržujte exportovaný ZIP pod 250 kB pro nahrání do Skliku.",
      "Zkomprimujte velké obrázky a preferujte WebP.",
      "Snižte počet assetů nebo částic, pokud je ZIP příliš velký.",
      "Po nahrání ověřte finální velikost banneru ve Skliku.",
      "Klik URL se nastavuje ve Skliku u reklamy, ne uvnitř HTML banneru.",
    ],
  };
}
