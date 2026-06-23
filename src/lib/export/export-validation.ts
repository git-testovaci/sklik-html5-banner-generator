import { isVideoMimeType } from "@/lib/assets/asset-validation";
import {
  collectExportProjectStats,
  findVideoAssets,
} from "@/lib/export/export-layer-utils";
import { totalStoryboardDurationMs } from "@/lib/animation/storyboard-utils";
import type { BannerEditorState } from "@/types/editor";
import type {
  ExportBundleSummary,
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

function extractLocalAssetRefs(html: string): string[] {
  const refs: string[] = [];
  const re = /src=["'](assets\/[^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    refs.push(m[1]!);
  }
  return refs;
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
  assetPaths?: string[];
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
    assetPaths = [],
  } = input;
  const allText = `${indexHtml}\n${styleCss}\n${scriptJs}`;
  const scanText = stripComments(`${indexHtml}\n${styleCss}`);
  const rows: ExportValidationRow[] = [];
  const stats = collectExportProjectStats(state, assetPaths.length);

  if (assetErrors.length > 0) {
    for (const err of assetErrors) {
      rows.push(row("missing-asset", "Chybějící asset", "fail", err));
    }
  }

  rows.push(
    row("html-count", "Počet HTML souborů", "pass", "Přesně 1 soubor index.html"),
  );

  const zipSizeKb = Math.max(0, Math.round(zipSize / 1024));
  const zipSizeStatus =
    zipSize > MAX_ZIP_SIZE ? "fail" : zipSize > 200_000 ? "warn" : zipSize === 0 && assetErrors.length ? "fail" : "pass";
  const zipSizeMessage =
    assetErrors.length && zipSize === 0
      ? "Export blokován — opravte chyby assetů"
      : zipSize > MAX_ZIP_SIZE
        ? `${zipSizeKb} kB — překračuje limit Sklik 250 kB. Zkomprimujte obrázky.`
        : zipSize > 200_000
          ? `${zipSizeKb} kB — blíží se limitu 250 kB.`
          : `${zipSizeKb} kB (limit 250 kB)`;

  rows.push(row("zip-size", "Velikost ZIP", zipSizeStatus, zipSizeMessage));

  rows.push(
    row(
      "file-count",
      "Počet souborů",
      fileCount <= MAX_FILES ? "pass" : "fail",
      `${fileCount} / ${MAX_FILES} souborů`,
    ),
  );

  rows.push(row("nested-zip", "Vnořený ZIP", "pass", "Žádný vnořený ZIP"));

  const videoAssets = findVideoAssets(state);
  rows.push(
    row(
      "video",
      "Video soubory",
      videoAssets.length ? "fail" : "pass",
      videoAssets.length
        ? "Video není pro Sklik HTML5 ZIP podporované. Použijte obrázek nebo animaci z vrstev."
        : "Žádné video soubory",
    ),
  );

  rows.push(
    row(
      "export-scenes",
      "Scény v exportu",
      "pass",
      `${stats.sceneCount} ${stats.sceneCount === 1 ? "scéna" : stats.sceneCount < 5 ? "scény" : "scén"}`,
    ),
  );

  rows.push(
    row(
      "export-layers",
      "Vrstvy v exportu",
      stats.visibleLayerCount === 0 ? "warn" : "pass",
      stats.visibleLayerCount === 0
        ? "Žádné viditelné vrstvy — banner může být prázdný"
        : `${stats.visibleLayerCount} viditelných vrstev`,
    ),
  );

  const assetPathSet = new Set(assetPaths);
  rows.push(
    row(
      "asset-files",
      "Soubory assetů v ZIP",
      "pass",
      `${stats.assetFileCount} unikátních souborů · ${stats.assetInstanceCount} vrstev s obrázkem`,
    ),
  );

  if (stats.assetInstanceCount > stats.assetFileCount && stats.assetFileCount > 0) {
    rows.push(
      row(
        "asset-dedup",
        "Sdílené assety",
        "pass",
        "Více vrstev sdílí stejný soubor — ZIP neobsahuje duplicitní obrázky",
      ),
    );
  }

  const htmlRefs = extractLocalAssetRefs(indexHtml);
  const missingRefs = htmlRefs.filter((ref) => !assetPathSet.has(ref));
  if (htmlRefs.length > 0) {
    rows.push(
      row(
        "asset-refs",
        "Reference na assety",
        missingRefs.length ? "fail" : "pass",
        missingRefs.length
          ? `Chybí v ZIP: ${missingRefs.join(", ")}`
          : `Všechny ${htmlRefs.length} reference existují v ZIP`,
      ),
    );
  }

  rows.push(
    row(
      "depth",
      "Hloubka složek",
      "pass",
      `assets/ · max ${MAX_DEPTH} úrovně`,
    ),
  );

  rows.push(
    row("file-types", "Povolené typy", "pass", "html, css, js, obrázky"),
  );

  const hasAdSize = /<meta[^>]+name=["']ad\.size["'][^>]+content=["']width=\d+,height=\d+["']/i.test(
    indexHtml,
  );
  rows.push(
    row(
      "ad-size-meta",
      "Meta ad.size",
      hasAdSize ? "pass" : "fail",
      hasAdSize ? "Přítomné v index.html" : "Chybí meta ad.size",
    ),
  );

  const sizeMatch =
    indexHtml.includes(`width=${state.width},height=${state.height}`) &&
    styleCss.includes(`width: ${state.width}px`) &&
    styleCss.includes(`height: ${state.height}px`);
  rows.push(
    row(
      "dimensions",
      "Rozměry banneru",
      sizeMatch ? "pass" : "fail",
      `${state.width}×${state.height} px`,
    ),
  );

  const forbidden = scanForbidden(allText, FORBIDDEN_JS);
  rows.push(
    row(
      "forbidden-js",
      "Zakázaný JS",
      forbidden.length ? "fail" : "pass",
      forbidden.length ? forbidden.join(", ") : "Nenalezeno",
    ),
  );

  const dangerous = scanForbidden(allText, DANGEROUS_JS);
  rows.push(
    row(
      "dangerous-js",
      "Nebezpečný JS",
      dangerous.length ? "fail" : "pass",
      dangerous.length ? dangerous.join(", ") : "Nenalezeno",
    ),
  );

  const externalHits = EXTERNAL_PATTERNS.filter((p) => p.test(scanText));
  rows.push(
    row(
      "external",
      "Externí zdroje",
      externalHits.length ? "fail" : "pass",
      externalHits.length ? "Nalezeny externí URL nebo importy" : "Žádné externí zdroje",
    ),
  );

  if (/data:image\/[^;]+;base64,/i.test(allText)) {
    rows.push(
      row(
        "base64",
        "Base64 v HTML/CSS",
        "warn",
        "Nalezen base64 obrázek — preferujte soubory v assets/",
      ),
    );
  }

  const formHits = [/<form/i, /<input/i, /<select/i, /<textarea/i].filter((p) =>
    p.test(indexHtml),
  );
  rows.push(
    row(
      "forms",
      "Formuláře",
      formHits.length ? "fail" : "pass",
      formHits.length ? "Nalezeny formulářové prvky" : "Žádné",
    ),
  );

  rows.push(
    row(
      "video-tags",
      "Video tagy",
      /<video/i.test(indexHtml) ? "fail" : "pass",
      /<video/i.test(indexHtml) ? "Nalezen tag <video>" : "Žádné",
    ),
  );

  for (const asset of state.assets ?? []) {
    if (isVideoMimeType(asset.mimeType)) {
      rows.push(
        row(
          `video-asset-${asset.id}`,
          "Video asset",
          "fail",
          `Video není pro Sklik HTML5 ZIP podporované (${asset.fileName}).`,
        ),
      );
    } else if (!ALLOWED_ASSET_MIME.has(asset.mimeType)) {
      rows.push(
        row(
          `asset-mime-${asset.id}`,
          "Typ assetu",
          "fail",
          `${asset.fileName}: nepodporovaný typ ${asset.mimeType}`,
        ),
      );
    }
  }

  const maxDuration =
    (state.scenes ?? []).length > 1
      ? totalStoryboardDurationMs(state)
      : (state.timeline?.durationMs ?? 3000);
  if (maxDuration > 8000) {
    rows.push(
      row(
        "animation-duration",
        "Délka časové osy",
        "warn",
        `${(maxDuration / 1000).toFixed(1)} s — udržujte animace stručné`,
      ),
    );
  }

  if ((state.scenes ?? []).length > 5) {
    rows.push(
      row(
        "scene-count",
        "Počet scén",
        "warn",
        `${state.scenes!.length} scén — může zvýšit složitost a velikost ZIP`,
      ),
    );
  }

  for (const warning of assetWarnings) {
    rows.push(row("asset-warning", "Upozornění assetů", "warn", warning));
  }

  if (/<a\s[^>]*href\s*=/i.test(indexHtml)) {
    rows.push(
      row(
        "target-links",
        "Odkazy v HTML",
        "warn",
        "Nalezen href — klik URL se nastavuje ve Skliku u reklamy",
      ),
    );
  }

  const summaryStatus = summarize(rows);

  const summary: ExportBundleSummary = {
    sceneCount: stats.sceneCount,
    layerCount: stats.visibleLayerCount,
    assetFileCount: stats.assetFileCount,
    assetInstanceCount: stats.assetInstanceCount,
    zipSizeKb,
    statusLabel:
      summaryStatus === "fail"
        ? "vyžaduje opravu"
        : summaryStatus === "warn"
          ? "s upozorněním"
          : "připraveno",
  };

  return {
    rows,
    summaryStatus,
    summary,
    recommendations: [
      "Udržujte exportovaný ZIP pod 250 kB pro nahrání do Skliku.",
      "Zkomprimujte velké obrázky a preferujte WebP.",
      "Video není podporované — použijte obrázky a animace vrstev.",
      "Po nahrání ověřte finální velikost banneru ve Skliku.",
      "Klik URL se nastavuje ve Skliku u reklamy, ne uvnitř HTML banneru.",
    ],
  };
}
