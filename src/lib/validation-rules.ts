import { BANNER_SIZES, formatBannerSize } from "@/lib/banner-sizes";
import { BANNER_ANIMATIONS } from "@/types/editor";
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
  const allowedAnimations = BANNER_ANIMATIONS.map((item) => item.value);
  const isAllowedAnimation = allowedAnimations.includes(state.animation);

  const textContrast = contrastRatio(state.backgroundColor, state.textColor);
  const ctaContrast = contrastRatio(
    state.ctaBackgroundColor,
    state.ctaTextColor,
  );

  const rows: ValidationRow[] = [
    {
      id: "banner-size",
      label: "Banner size",
      value: isAllowedSize ? sizeLabel : `${sizeLabel} (non-standard)`,
      status: isAllowedSize ? "pass" : "warn",
    },
    {
      id: "headline-length",
      label: "Headline length",
      value: `${state.headline.length} characters`,
      status: textLengthStatus(state.headline.length, 40, 60),
    },
    {
      id: "subheadline-length",
      label: "Subheadline length",
      value: `${state.subheadline.length} characters`,
      status: textLengthStatus(state.subheadline.length, 60, 90),
    },
    {
      id: "cta-length",
      label: "CTA length",
      value: `${state.cta.length} characters`,
      status: textLengthStatus(state.cta.length, 18, 28),
    },
    {
      id: "text-contrast",
      label: "Text contrast",
      value:
        textContrast === null
          ? "Could not evaluate colors"
          : `Ratio ${textContrast.toFixed(1)}:1`,
      status: contrastStatus(textContrast),
    },
    {
      id: "cta-contrast",
      label: "CTA contrast",
      value:
        ctaContrast === null
          ? "Could not evaluate colors"
          : `Ratio ${ctaContrast.toFixed(1)}:1`,
      status: contrastStatus(ctaContrast),
    },
    {
      id: "animation",
      label: "Animation",
      value: state.animation,
      status: isAllowedAnimation ? "pass" : "fail",
    },
    {
      id: "external-sources",
      label: "External sources",
      value: "None in preview",
      status: "pass",
    },
    {
      id: "forbidden-js",
      label: "Forbidden JS",
      value: "Not generated yet",
      status: "pass",
    },
    {
      id: "zip-size",
      label: "ZIP size",
      value: "Use Generate Sklik ZIP below",
      status: "info",
    },
    {
      id: "file-count",
      label: "File count",
      value: "Use Generate Sklik ZIP below",
      status: "info",
    },
    {
      id: "html-file",
      label: "HTML file",
      value: "Use Generate Sklik ZIP below",
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
