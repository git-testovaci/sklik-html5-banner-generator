import {
  assetAtCorner,
  clampPlacementToBanner,
  createDefaultAssetPlacement,
  defaultLayerAnimations,
  defaultTimeline,
  safeInset,
} from "@/lib/animation/timeline-utils";
import type { BannerAssetPlacement, TextLayerPlacement } from "@/types/assets";
import type { LayerAnimation } from "@/types/animation";
import type { BannerTemplate, BannerTemplateId } from "@/types/templates";

function textLayer(
  layerId: TextLayerPlacement["layerId"],
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  width: number,
  height: number,
): TextLayerPlacement {
  const clamped = clampPlacementToBanner({ x, y, width: w, height: h }, width, height);
  return {
    layerId,
    visible: true,
    opacity: 1,
    rotation: 0,
    zIndex: z,
    ...clamped,
  };
}

function assetForTemplate(
  kind: BannerAssetPlacement["kind"],
  assetId: string,
  width: number,
  height: number,
  layout: BannerTemplateId,
): BannerAssetPlacement {
  const pad = safeInset(width, height);
  const base = createDefaultAssetPlacement(assetId, kind, width, height);

  switch (layout) {
    case "product-hero":
      if (kind === "product") {
        return {
          ...base,
          x: Math.round(width * 0.52),
          y: pad,
          width: Math.round(width * 0.42),
          height: height - pad * 2,
          zIndex: 15,
        };
      }
      if (kind === "logo") {
        return assetAtCorner(assetId, kind, "top-left", Math.round(width * 0.2), Math.round(height * 0.14), width, height, 20);
      }
      if (kind === "background") {
        return { ...base, x: 0, y: 0, width, height, zIndex: 1, fit: "cover" };
      }
      break;
    case "logo-cta":
      if (kind === "logo") {
        return assetAtCorner(assetId, kind, "top-left", Math.round(width * 0.22), Math.round(height * 0.16), width, height, 20);
      }
      if (kind === "product") {
        return assetAtCorner(assetId, kind, "bottom-right", Math.round(width * 0.28), Math.round(height * 0.35), width, height, 14);
      }
      break;
    case "split-layout":
      if (kind === "product") {
        return {
          ...base,
          x: Math.round(width * 0.55),
          y: pad,
          width: Math.round(width * 0.4),
          height: height - pad * 2,
          zIndex: 12,
        };
      }
      if (kind === "logo") {
        return assetAtCorner(assetId, kind, "top-left", Math.round(width * 0.18), Math.round(height * 0.12), width, height, 18);
      }
      break;
    case "square-social":
      if (kind === "product") {
        return {
          ...base,
          x: pad,
          y: Math.round(height * 0.38),
          width: width - pad * 2,
          height: Math.round(height * 0.38),
          zIndex: 12,
        };
      }
      if (kind === "logo") {
        return assetAtCorner(assetId, kind, "top-left", Math.round(width * 0.25), Math.round(height * 0.1), width, height, 20);
      }
      break;
    case "wide-leaderboard":
      if (kind === "product") {
        return assetAtCorner(assetId, kind, "center", Math.round(height * 0.85), Math.round(height * 0.75), width, height, 12);
      }
      if (kind === "logo") {
        return assetAtCorner(assetId, kind, "top-left", Math.round(height * 0.7), Math.round(height * 0.55), width, height, 18);
      }
      break;
    default:
      break;
  }

  return base;
}

const TIMELINE_3S = defaultTimeline();

function makeTemplate(
  id: BannerTemplateId,
  name: string,
  description: string,
  textFn: (w: number, h: number) => TextLayerPlacement[],
  layerAnimations: LayerAnimation[] = defaultLayerAnimations(),
): BannerTemplate {
  return {
    id,
    name,
    description,
    textPlacements: textFn,
    assetPlacementsForKind: (kind, assetId, w, h) =>
      assetForTemplate(kind, assetId, w, h, id),
    layerAnimations,
    timeline: TIMELINE_3S,
  };
}

export const BANNER_TEMPLATES: BannerTemplate[] = [
  makeTemplate(
    "product-hero",
    "Produkt v popředí",
    "Velký produkt vpravo, text vlevo.",
    (w, h) => {
      const pad = safeInset(w, h);
      return [
        textLayer("headline", pad, Math.round(h * 0.22), Math.round(w * 0.48), Math.round(h * 0.2), 30, w, h),
        textLayer("subheadline", pad, Math.round(h * 0.44), Math.round(w * 0.48), Math.round(h * 0.14), 31, w, h),
        textLayer("cta", pad, Math.round(h * 0.62), Math.round(w * 0.32), Math.round(h * 0.14), 32, w, h),
      ];
    },
  ),
  makeTemplate(
    "logo-cta",
    "Logo + výzva k akci",
    "Kompaktní logo a výrazné tlačítko.",
    (w, h) => {
      const pad = safeInset(w, h);
      return [
        textLayer("headline", pad, Math.round(h * 0.28), Math.round(w * 0.55), Math.round(h * 0.22), 30, w, h),
        textLayer("subheadline", pad, Math.round(h * 0.5), Math.round(w * 0.55), Math.round(h * 0.14), 31, w, h),
        textLayer("cta", pad, Math.round(h * 0.68), Math.round(w * 0.36), Math.round(h * 0.16), 32, w, h),
      ];
    },
  ),
  makeTemplate(
    "big-headline",
    "Velký nadpis",
    "Layout s důrazem na krátkou zprávu.",
    (w, h) => {
      const pad = safeInset(w, h);
      return [
        textLayer("headline", pad, Math.round(h * 0.18), w - pad * 2, Math.round(h * 0.32), 30, w, h),
        textLayer("subheadline", pad, Math.round(h * 0.52), w - pad * 2, Math.round(h * 0.14), 31, w, h),
        textLayer("cta", pad, Math.round(h * 0.7), Math.round(w * 0.4), Math.round(h * 0.14), 32, w, h),
      ];
    },
  ),
  makeTemplate(
    "split-layout",
    "Rozdělený layout",
    "Text vlevo, produkt vpravo.",
    (w, h) => {
      const pad = safeInset(w, h);
      return [
        textLayer("headline", pad, Math.round(h * 0.2), Math.round(w * 0.5), Math.round(h * 0.2), 30, w, h),
        textLayer("subheadline", pad, Math.round(h * 0.42), Math.round(w * 0.5), Math.round(h * 0.14), 31, w, h),
        textLayer("cta", pad, Math.round(h * 0.6), Math.round(w * 0.34), Math.round(h * 0.14), 32, w, h),
      ];
    },
  ),
  makeTemplate(
    "minimal-brand",
    "Minimalistická značka",
    "Čistý centrovaný text a jemný pohyb.",
    (w, h) => {
      const pad = safeInset(w, h);
      const cw = w - pad * 2;
      return [
        textLayer("headline", pad, Math.round(h * 0.3), cw, Math.round(h * 0.18), 30, w, h),
        textLayer("subheadline", pad, Math.round(h * 0.48), cw, Math.round(h * 0.12), 31, w, h),
        textLayer("cta", Math.round(w * 0.32), Math.round(h * 0.64), Math.round(w * 0.36), Math.round(h * 0.14), 32, w, h),
      ];
    },
  ),
  makeTemplate(
    "square-social",
    "Čtvercový formát",
    "Vrstvený layout pro čtvercové formáty.",
    (w, h) => {
      const pad = safeInset(w, h);
      return [
        textLayer("headline", pad, Math.round(h * 0.08), w - pad * 2, Math.round(h * 0.14), 30, w, h),
        textLayer("subheadline", pad, Math.round(h * 0.22), w - pad * 2, Math.round(h * 0.1), 31, w, h),
        textLayer("cta", pad, Math.round(h * 0.82), Math.round(w * 0.45), Math.round(h * 0.1), 32, w, h),
      ];
    },
  ),
  makeTemplate(
    "wide-leaderboard",
    "Leaderboard",
    "Horizontální pruh s obsahem v řadě.",
    (w, h) => {
      const pad = safeInset(w, h);
      return [
        textLayer("headline", Math.round(w * 0.22), pad, Math.round(w * 0.35), h - pad * 2, 30, w, h),
        textLayer("subheadline", Math.round(w * 0.22), Math.round(h * 0.35), Math.round(w * 0.35), Math.round(h * 0.25), 31, w, h),
        textLayer("cta", Math.round(w * 0.58), Math.round(h * 0.28), Math.round(w * 0.18), Math.round(h * 0.44), 32, w, h),
      ];
    },
  ),
];

export function getTemplateById(id: BannerTemplateId): BannerTemplate | undefined {
  return BANNER_TEMPLATES.find((t) => t.id === id);
}
