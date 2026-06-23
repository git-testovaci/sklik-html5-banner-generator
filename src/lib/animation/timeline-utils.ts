import type { AnimationPreset, BannerTimeline, LayerAnimation } from "@/types/animation";
import type {
  BannerAsset,
  BannerAssetPlacement,
  TextLayerPlacement,
} from "@/types/assets";
import type { BannerAnimation, BannerEditorState } from "@/types/editor";
import type { BannerProject } from "@/types/project";

export const DEFAULT_TIMELINE_DURATION_MS = 3000;

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampTiming(
  startMs: number,
  durationMs: number,
  timelineDurationMs: number,
): { startMs: number; durationMs: number; clamped: boolean } {
  const safeStart = clampNumber(startMs, 0, timelineDurationMs);
  const minDuration = 100;
  let safeDuration = clampNumber(durationMs, minDuration, timelineDurationMs);
  let clamped = safeStart !== startMs || safeDuration !== durationMs;

  if (safeStart + safeDuration > timelineDurationMs) {
    safeDuration = Math.max(minDuration, timelineDurationMs - safeStart);
    clamped = true;
  }

  return { startMs: safeStart, durationMs: safeDuration, clamped };
}

function defaultTextPlacements(
  width: number,
  height: number,
): TextLayerPlacement[] {
  return [
    {
      layerId: "headline",
      visible: true,
      x: Math.round(width * 0.08),
      y: Math.round(height * 0.28),
      width: Math.round(width * 0.55),
      height: Math.round(height * 0.22),
      opacity: 1,
      rotation: 0,
      zIndex: 30,
    },
    {
      layerId: "subheadline",
      visible: true,
      x: Math.round(width * 0.08),
      y: Math.round(height * 0.5),
      width: Math.round(width * 0.55),
      height: Math.round(height * 0.18),
      opacity: 1,
      rotation: 0,
      zIndex: 31,
    },
    {
      layerId: "cta",
      visible: true,
      x: Math.round(width * 0.08),
      y: Math.round(height * 0.72),
      width: Math.round(width * 0.35),
      height: Math.round(height * 0.16),
      opacity: 1,
      rotation: 0,
      zIndex: 32,
    },
  ];
}

function defaultAssetPlacements(
  _width: number,
  _height: number,
): BannerAssetPlacement[] {
  return [];
}

export function defaultLayerAnimations(): LayerAnimation[] {
  return [
    {
      layerId: "logo",
      layerType: "logo",
      enabled: true,
      preset: "fade-in",
      startMs: 0,
      durationMs: 600,
      easing: "ease-out",
      direction: "normal",
      distancePx: 12,
      opacityFrom: 0,
      opacityTo: 1,
      scaleFrom: 1,
      scaleTo: 1,
    },
    {
      layerId: "product",
      layerType: "product",
      enabled: true,
      preset: "slide-in-right",
      startMs: 250,
      durationMs: 700,
      easing: "ease-out",
      direction: "normal",
      distancePx: 16,
      opacityFrom: 0,
      opacityTo: 1,
      scaleFrom: 1,
      scaleTo: 1,
    },
    {
      layerId: "headline",
      layerType: "headline",
      enabled: true,
      preset: "slide-up",
      startMs: 500,
      durationMs: 700,
      easing: "ease-out",
      direction: "normal",
      distancePx: 10,
      opacityFrom: 0,
      opacityTo: 1,
      scaleFrom: 1,
      scaleTo: 1,
    },
    {
      layerId: "subheadline",
      layerType: "subheadline",
      enabled: true,
      preset: "fade-in",
      startMs: 800,
      durationMs: 600,
      easing: "ease-out",
      direction: "normal",
      distancePx: 8,
      opacityFrom: 0,
      opacityTo: 1,
      scaleFrom: 1,
      scaleTo: 1,
    },
    {
      layerId: "cta",
      layerType: "cta",
      enabled: true,
      preset: "soft-pulse",
      startMs: 1200,
      durationMs: 1800,
      easing: "ease-in-out",
      direction: "normal",
      distancePx: 8,
      opacityFrom: 1,
      opacityTo: 1,
      scaleFrom: 1,
      scaleTo: 1,
    },
  ];
}

export function defaultTimeline(): BannerTimeline {
  return {
    durationMs: DEFAULT_TIMELINE_DURATION_MS,
    loop: false,
    backgroundAnimation: "none",
  };
}

export function defaultStudioPlacements(width: number, height: number): {
  assetPlacements: BannerAssetPlacement[];
  textPlacements: TextLayerPlacement[];
} {
  return {
    assetPlacements: defaultAssetPlacements(width, height),
    textPlacements: defaultTextPlacements(width, height),
  };
}

export function createDefaultAssetPlacement(
  assetId: string,
  kind: BannerAssetPlacement["kind"],
  width: number,
  height: number,
): BannerAssetPlacement {
  const presets: Record<
    BannerAssetPlacement["kind"],
    Omit<BannerAssetPlacement, "assetId" | "kind">
  > = {
    logo: {
      visible: true,
      x: Math.round(width * 0.06),
      y: Math.round(height * 0.06),
      width: Math.round(width * 0.22),
      height: Math.round(height * 0.18),
      opacity: 1,
      rotation: 0,
      zIndex: 20,
      fit: "contain",
      borderRadius: 0,
      shadow: false,
    },
    product: {
      visible: true,
      x: Math.round(width * 0.58),
      y: Math.round(height * 0.12),
      width: Math.round(width * 0.36),
      height: Math.round(height * 0.76),
      opacity: 1,
      rotation: 0,
      zIndex: 15,
      fit: "contain",
      borderRadius: 4,
      shadow: true,
    },
    background: {
      visible: true,
      x: 0,
      y: 0,
      width,
      height,
      opacity: 1,
      rotation: 0,
      zIndex: 1,
      fit: "cover",
      borderRadius: 0,
      shadow: false,
    },
    decoration: {
      visible: true,
      x: Math.round(width * 0.7),
      y: Math.round(height * 0.04),
      width: Math.round(width * 0.2),
      height: Math.round(height * 0.2),
      opacity: 0.9,
      rotation: 0,
      zIndex: 25,
      fit: "contain",
      borderRadius: 0,
      shadow: false,
    },
  };

  return { assetId, kind, ...presets[kind] };
}

export function layerAnimationsFromLegacy(
  animation: BannerAnimation,
): LayerAnimation[] {
  const base = defaultLayerAnimations();
  if (animation === "none") return base.map((a) => ({ ...a, preset: "none" as AnimationPreset, enabled: false }));

  const presetMap: Record<BannerAnimation, AnimationPreset> = {
    none: "none",
    "fade-in": "fade-in",
    "slide-up": "slide-up",
    "soft-pulse": "soft-pulse",
  };

  return base.map((a) =>
    a.layerId === "headline"
      ? { ...a, preset: presetMap[animation], enabled: true }
      : a,
  );
}

export function normalizeEditorState(
  partial: BannerEditorState,
): BannerEditorState {
  const width = partial.width;
  const height = partial.height;
  const defaults = defaultStudioPlacements(width, height);

  return {
    projectId: partial.projectId,
    name: partial.name ?? "Untitled banner",
    status: partial.status ?? "draft",
    width,
    height,
    headline: partial.headline ?? "Your headline here",
    subheadline: partial.subheadline ?? "Supporting message",
    cta: partial.cta ?? "Learn more",
    backgroundColor: partial.backgroundColor ?? "#0f172a",
    textColor: partial.textColor ?? "#f8fafc",
    ctaBackgroundColor: partial.ctaBackgroundColor ?? "#7c3aed",
    ctaTextColor: partial.ctaTextColor ?? "#ffffff",
    accentColor: partial.accentColor ?? "#a78bfa",
    animation: partial.animation ?? "fade-in",
    logoLabel: partial.logoLabel ?? "Logo",
    productImageLabel: partial.productImageLabel ?? "Product",
    shareId: partial.shareId ?? "",
    assets: partial.assets ?? [],
    assetPlacements: partial.assetPlacements ?? defaults.assetPlacements,
    textPlacements: partial.textPlacements ?? defaults.textPlacements,
    timeline: partial.timeline ?? defaultTimeline(),
    layerAnimations:
      partial.layerAnimations ??
      layerAnimationsFromLegacy(partial.animation ?? "fade-in"),
  };
}

export function projectToEditorState(project: BannerProject): BannerEditorState {
  return normalizeEditorState({
    projectId: project.id,
    name: project.name,
    status: project.status,
    width: project.width,
    height: project.height,
    headline: project.headline,
    subheadline: project.subheadline,
    cta: project.cta,
    backgroundColor: project.backgroundColor,
    textColor: project.textColor,
    ctaBackgroundColor: project.ctaBackgroundColor,
    ctaTextColor: project.ctaTextColor,
    accentColor: project.accentColor,
    animation: project.animation,
    logoLabel: project.logoLabel,
    productImageLabel: project.productImageLabel,
    shareId: project.shareId,
    assets: project.assets,
    assetPlacements: project.assetPlacements,
    textPlacements: project.textPlacements,
    timeline: project.timeline,
    layerAnimations: project.layerAnimations,
  });
}

export function editorStateToProject(
  state: BannerEditorState,
  existing?: BannerProject,
): BannerProject {
  const now = new Date().toISOString();
  return {
    id: state.projectId,
    name: state.name,
    status: state.status,
    width: state.width,
    height: state.height,
    headline: state.headline,
    subheadline: state.subheadline,
    cta: state.cta,
    backgroundColor: state.backgroundColor,
    textColor: state.textColor,
    ctaBackgroundColor: state.ctaBackgroundColor,
    ctaTextColor: state.ctaTextColor,
    accentColor: state.accentColor,
    animation: state.animation,
    logoLabel: state.logoLabel,
    productImageLabel: state.productImageLabel,
    shareId: state.shareId || existing?.shareId || "share-unknown",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    assets: state.assets ?? [],
    assetPlacements: state.assetPlacements ?? [],
    textPlacements: state.textPlacements ?? [],
    timeline: state.timeline ?? defaultTimeline(),
    layerAnimations: state.layerAnimations ?? defaultLayerAnimations(),
  };
}

export function getLayerAnimation(
  state: BannerEditorState,
  layerId: string,
): LayerAnimation | undefined {
  return (state.layerAnimations ?? []).find((a) => a.layerId === layerId);
}

export function getAssetByKind(
  state: BannerEditorState,
  kind: BannerAsset["kind"],
): BannerAsset | undefined {
  return (state.assets ?? []).find((a) => a.kind === kind);
}

export function getPlacementForAsset(
  state: BannerEditorState,
  assetId: string,
): BannerAssetPlacement | undefined {
  return (state.assetPlacements ?? []).find((p) => p.assetId === assetId);
}

export function getTextPlacement(
  state: BannerEditorState,
  layerId: TextLayerPlacement["layerId"],
): TextLayerPlacement | undefined {
  return (state.textPlacements ?? []).find((p) => p.layerId === layerId);
}

export function layerAnimationsForImport(complexity: "low" | "medium" | "high"): LayerAnimation[] {
  const base = defaultLayerAnimations();
  if (complexity === "high") {
    return base.map((a) => ({ ...a, durationMs: Math.min(a.durationMs + 200, 1200) }));
  }
  if (complexity === "low") {
    return base.map((a) =>
      a.preset === "soft-pulse" ? { ...a, preset: "fade-in", durationMs: 500 } : a,
    );
  }
  return base;
}
