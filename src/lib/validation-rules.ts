import { BANNER_SIZES, formatBannerSize } from "@/lib/banner-sizes";
import { isVideoMimeType } from "@/lib/assets/asset-validation";
import type { BannerEditorState } from "@/types/editor";
import type { ValidationRow, ValidationSummary } from "@/types/validation";

function textLengthStatus(
  length: number,
  warnAt: number,
  failAt: number,
): ValidationRow["status"] {
  if (length > failAt) return "fail";
  if (length > warnAt) return "warn";
  return "pass";
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  );
}

function contrastRatio(colorA: string, colorB: string): number | null {
  const rgbA = parseHexColor(colorA);
  const rgbB = parseHexColor(colorB);
  if (!rgbA || !rgbB) return null;

  const lumA = relativeLuminance(rgbA.r, rgbA.g, rgbA.b);
  const lumB = relativeLuminance(rgbB.r, rgbB.g, rgbB.b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
}

function contrastStatus(ratio: number | null): ValidationRow["status"] {
  if (ratio === null) return "warn";
  if (ratio >= 4.5) return "pass";
  if (ratio >= 3) return "warn";
  return "fail";
}

function computeOverallStatus(
  rows: ValidationRow[],
): ValidationSummary["overallStatus"] {
  if (rows.some((row) => row.status === "fail")) return "fail";
  if (rows.some((row) => row.status === "warn")) return "warn";
  return "pass";
}

export function getValidationSummary(
  state: BannerEditorState,
): ValidationSummary {
  const sizeLabel = formatBannerSize(state.width, state.height);
  const isAllowedSize = BANNER_SIZES.some(
    (size) => size.width === state.width && size.height === state.height,
  );
  const textContrast = contrastRatio(state.backgroundColor, state.textColor);
  const ctaContrast = contrastRatio(
    state.ctaBackgroundColor,
    state.ctaTextColor,
  );

  const rows: ValidationRow[] = [
    {
      id: "banner-size",
      label: "Velikost banneru",
      value: isAllowedSize ? sizeLabel : `${sizeLabel} (nestandardní)`,
      status: isAllowedSize ? "pass" : "warn",
    },
    {
      id: "headline-length",
      label: "Délka nadpisu",
      value: `${state.headline.length} znaků`,
      status: textLengthStatus(state.headline.length, 40, 60),
    },
    {
      id: "subheadline-length",
      label: "Délka podnadpisu",
      value: `${state.subheadline.length} znaků`,
      status: textLengthStatus(state.subheadline.length, 60, 90),
    },
    {
      id: "cta-length",
      label: "Délka CTA",
      value: `${state.cta.length} znaků`,
      status: textLengthStatus(state.cta.length, 18, 28),
    },
    {
      id: "text-contrast",
      label: "Kontrast textu",
      value:
        textContrast === null
          ? "Barvy nelze vyhodnotit"
          : `Poměr ${textContrast.toFixed(1)}:1`,
      status: contrastStatus(textContrast),
    },
    {
      id: "cta-contrast",
      label: "Kontrast CTA",
      value:
        ctaContrast === null
          ? "Barvy nelze vyhodnotit"
          : `Poměr ${ctaContrast.toFixed(1)}:1`,
      status: contrastStatus(ctaContrast),
    },
    {
      id: "storyboard-duration",
      label: "Délka storyboardu",
      value: (() => {
        const scenes = state.scenes ?? [];
        const total = scenes.reduce((s, sc) => s + sc.durationMs, 0);
        return scenes.length > 0
          ? `${scenes.length} scén · ${(total / 1000).toFixed(1)} s`
          : "Jedna scéna";
      })(),
      status: (() => {
        const total = (state.scenes ?? []).reduce((s, sc) => s + sc.durationMs, 0);
        if (total > 15000) return "warn";
        return "pass";
      })(),
    },
    {
      id: "missing-media",
      label: "Chybějící média",
      value: (() => {
        const assetIds = new Set((state.assets ?? []).map((a) => a.id));
        const missing = (state.bannerLayers ?? []).filter(
          (l) => l.assetId && !assetIds.has(l.assetId),
        );
        const video = (state.assets ?? []).filter((a) => isVideoMimeType(a.mimeType));
        if (video.length > 0) return `${video.length} video soubor — nelze exportovat`;
        if (missing.length > 0) return `${missing.length} vrstev bez souboru v knihovně`;
        return "Všechna média nalezena";
      })(),
      status: (() => {
        const assetIds = new Set((state.assets ?? []).map((a) => a.id));
        if ((state.assets ?? []).some((a) => isVideoMimeType(a.mimeType))) return "fail";
        const missing = (state.bannerLayers ?? []).filter(
          (l) => l.assetId && !assetIds.has(l.assetId),
        );
        return missing.length > 0 ? "warn" : "pass";
      })(),
    },
    {
      id: "particles",
      label: "Vrstvy částic",
      value: (() => {
        const count = (state.bannerLayers ?? []).filter((l) => l.type === "particle").length;
        const particles = (state.bannerLayers ?? []).filter((l) => l.type === "particle");
        const maxCount = particles.reduce((m, l) => Math.max(m, l.particleCount ?? 0), 0);
        return count > 0 ? `${count} vrstev, max ${maxCount} částic` : "Žádné";
      })(),
      status: (() => {
        const particles = (state.bannerLayers ?? []).filter((l) => l.type === "particle");
        if (particles.some((l) => (l.particleCount ?? 0) > 35)) return "warn";
        return "pass";
      })(),
    },
    {
      id: "scene-count",
      label: "Počet scén",
      value: `${(state.scenes ?? []).length || 1} scén`,
      status: (state.scenes ?? []).length > 5 ? "warn" : "pass",
    },
    {
      id: "video-assets",
      label: "Video v projektu",
      value: (() => {
        const videos = (state.assets ?? []).filter(
          (a) => a.mimeType.startsWith("video/") || a.mimeType === "application/mp4",
        );
        return videos.length > 0
          ? `${videos.length} video — nelze exportovat`
          : "Žádné video";
      })(),
      status: (() => {
        const hasVideo = (state.assets ?? []).some(
          (a) => a.mimeType.startsWith("video/") || a.mimeType === "application/mp4",
        );
        return hasVideo ? "fail" : "pass";
      })(),
    },
    {
      id: "local-preview",
      label: "Lokální náhled assetů",
      value:
        (state.assets ?? []).length > 0
          ? "Obrázky jsou jen v tomto prohlížeči — veřejný náhled může lišit"
          : "Bez nahraných assetů",
      status: (state.assets ?? []).length > 0 ? "info" : "pass",
    },
    {
      id: "external-sources",
      label: "Externí zdroje",
      value: "V náhledu žádné",
      status: "pass",
    },
    {
      id: "forbidden-js",
      label: "Zakázaný JS",
      value: "Zatím negenerováno",
      status: "pass",
    },
    {
      id: "zip-size",
      label: "Velikost ZIP",
      value: "Vygenerujte Sklik ZIP níže",
      status: "info",
    },
    {
      id: "file-count",
      label: "Počet souborů",
      value: "Vygenerujte Sklik ZIP níže",
      status: "info",
    },
    {
      id: "html-file",
      label: "HTML soubor",
      value: "Vygenerujte Sklik ZIP níže",
      status: "info",
    },
  ];

  const overallStatus = computeOverallStatus(
    rows.filter((row) => row.status !== "pending" && row.status !== "info"),
  );

  return {
    rows,
    exportReady: overallStatus !== "fail",
    overallStatus,
  };
}
