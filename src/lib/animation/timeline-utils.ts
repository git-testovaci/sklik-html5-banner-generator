import type { AnimationPreset, BannerTimeline, LayerAnimation } from "@/types/animation";
import { presetDefaultEnterFrom } from "@/types/animation";
import type {
  BannerAsset,
  BannerAssetPlacement,
  TextLayerPlacement,
} from "@/types/assets";
import type { BannerAnimation, BannerEditorState, SelectedLayer } from "@/types/editor";
import type { BannerProject } from "@/types/project";
import {
  editorStateToProjectWithStoryboard,
  migrateToStoryboard,
  resolveStoryboardSelection,
  syncFlatFromActiveScene,
} from "./storyboard-utils";

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
  const headlineFs = Math.max(10, Math.round(height * 0.08));
  const subFs = Math.max(8, Math.round(height * 0.055));
  const ctaFs = Math.max(8, Math.round(height * 0.055));
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
      fontSize: headlineFs,
      fontWeight: 700,
      textAlign: "left",
      lineHeight: 1.15,
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
      fontSize: subFs,
      fontWeight: 400,
      textAlign: "left",
      lineHeight: 1.25,
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
      fontSize: ctaFs,
      fontWeight: 600,
      textAlign: "center",
      lineHeight: 1.2,
    },
  ];
}

function mergeTextPlacements(
  partial: TextLayerPlacement[] | undefined,
  width: number,
  height: number,
): TextLayerPlacement[] {
  const defaults = defaultTextPlacements(width, height);
  if (!partial?.length) return defaults;
  return defaults.map((def) => {
    const existing = partial.find((p) => p.layerId === def.layerId);
    if (!existing) return def;
    return {
      ...def,
      ...existing,
      fontSize: existing.fontSize ?? def.fontSize,
      fontWeight: existing.fontWeight ?? def.fontWeight,
      textAlign: existing.textAlign ?? def.textAlign,
      lineHeight: existing.lineHeight ?? def.lineHeight,
    };
  });
}

function normalizeLayerAnimation(anim: LayerAnimation): LayerAnimation {
  return {
    ...anim,
    enterFrom: anim.enterFrom ?? presetDefaultEnterFrom(anim.preset),
    opacityFrom: Number.isFinite(anim.opacityFrom) ? anim.opacityFrom : 0,
    opacityTo: Number.isFinite(anim.opacityTo) ? anim.opacityTo : 1,
    scaleFrom: Number.isFinite(anim.scaleFrom) ? anim.scaleFrom : 1,
    scaleTo: Number.isFinite(anim.scaleTo) ? anim.scaleTo : 1,
  };
}

function defaultAssetPlacements(): BannerAssetPlacement[] {
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
      enterFrom: "none",
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
      enterFrom: "right",
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
      enterFrom: "up",
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
      enterFrom: "none",
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
      enterFrom: "none",
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
    assetPlacements: defaultAssetPlacements(),
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

  const base: BannerEditorState = {
    projectId: partial.projectId,
    name: partial.name ?? "Nepojmenovaný banner",
    status: partial.status ?? "draft",
    width,
    height,
    headline: partial.headline ?? "Váš nadpis zde",
    subheadline: partial.subheadline ?? "Podnadpis nebo krátký popis",
    cta: partial.cta ?? "Zjistit více",
    backgroundColor: partial.backgroundColor ?? "#0f172a",
    textColor: partial.textColor ?? "#f8fafc",
    ctaBackgroundColor: partial.ctaBackgroundColor ?? "#7c3aed",
    ctaTextColor: partial.ctaTextColor ?? "#ffffff",
    accentColor: partial.accentColor ?? "#a78bfa",
    animation: partial.animation ?? "fade-in",
    logoLabel: partial.logoLabel ?? "Logo",
    productImageLabel: partial.productImageLabel ?? "Produkt",
    shareId: partial.shareId ?? "",
    assets: partial.assets ?? [],
    assetPlacements: partial.assetPlacements ?? defaults.assetPlacements,
    textPlacements: mergeTextPlacements(partial.textPlacements, width, height),
    timeline: partial.timeline ?? defaultTimeline(),
    layerAnimations: (partial.layerAnimations ?? layerAnimationsFromLegacy(partial.animation ?? "fade-in")).map(
      normalizeLayerAnimation,
    ),
    scenes: partial.scenes,
    bannerLayers: partial.bannerLayers,
    layerEffects: partial.layerEffects,
    layerKeyframes: partial.layerKeyframes,
    activeSceneId: partial.activeSceneId,
  };

  const migrated = migrateToStoryboard(base);
  return syncFlatFromActiveScene(migrated);
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
    scenes: project.scenes,
    bannerLayers: project.bannerLayers,
    layerEffects: project.layerEffects,
    layerKeyframes: project.layerKeyframes,
    activeSceneId: project.activeSceneId,
  });
}

export function editorStateToProject(
  state: BannerEditorState,
  existing?: BannerProject,
): BannerProject {
  return editorStateToProjectWithStoryboard(state, existing);
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

export function safeInset(width: number, height: number): number {
  return Math.max(12, Math.round(Math.min(width, height) * 0.08));
}

export function clampPlacementLoose(
  p: Pick<TextLayerPlacement, "x" | "y" | "width" | "height">,
  bannerWidth: number,
  bannerHeight: number,
  minSize = 8,
): Pick<TextLayerPlacement, "x" | "y" | "width" | "height"> {
  const width = clampNumber(p.width, minSize, bannerWidth * 1.2);
  const height = clampNumber(p.height, minSize, bannerHeight * 1.2);
  const x = clampNumber(p.x, -bannerWidth * 0.2, bannerWidth * 1.2 - width);
  const y = clampNumber(p.y, -bannerHeight * 0.2, bannerHeight * 1.2 - height);
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function layerAnimIdForAsset(kind: BannerAssetPlacement["kind"], assetId: string): string {
  return kind === "decoration" ? `decoration-${assetId}` : kind;
}

export function resolveSelectedLayer(
  state: BannerEditorState,
  selected: SelectedLayer,
): SelectedLayer {
  if ((state.scenes ?? []).length > 0) {
    return resolveStoryboardSelection(state, selected);
  }
  if (selected.type === "text") {
    const exists = (state.textPlacements ?? []).some((p) => p.layerId === selected.id);
    return exists ? selected : { type: "text", id: "headline" };
  }
  const exists = (state.assetPlacements ?? []).some((p) => p.assetId === selected.id);
  if (exists) return selected;
  const first = (state.assetPlacements ?? [])[0];
  if (first) return { type: "asset", id: first.assetId };
  return { type: "text", id: "headline" };
}

export function clampTextPlacementFields(
  p: TextLayerPlacement,
  bannerWidth: number,
  bannerHeight: number,
): TextLayerPlacement {
  const defaults = defaultTextPlacements(bannerWidth, bannerHeight).find(
    (d) => d.layerId === p.layerId,
  );
  const geom = clampPlacementLoose(p, bannerWidth, bannerHeight);
  const fontSize = p.fontSize ?? defaults?.fontSize ?? 12;
  return {
    ...p,
    ...geom,
    fontSize: clampNumber(fontSize, 6, Math.round(bannerHeight * 0.4)),
    fontWeight: clampNumber(p.fontWeight ?? defaults?.fontWeight ?? 400, 100, 900),
    lineHeight: clampNumber(p.lineHeight ?? defaults?.lineHeight ?? 1.2, 0.8, 2.5),
    textAlign: p.textAlign ?? defaults?.textAlign ?? "left",
    opacity: clampNumber(p.opacity, 0, 1),
  };
}

export function clampPlacementToBanner(
  p: Pick<TextLayerPlacement, "x" | "y" | "width" | "height">,
  bannerWidth: number,
  bannerHeight: number,
): Pick<TextLayerPlacement, "x" | "y" | "width" | "height"> {
  const pad = safeInset(bannerWidth, bannerHeight);
  const maxW = Math.max(20, bannerWidth - pad * 2);
  const maxH = Math.max(12, bannerHeight - pad * 2);
  const width = Math.min(Math.max(20, p.width), maxW);
  const height = Math.min(Math.max(12, p.height), maxH);
  const x = Math.min(Math.max(pad, p.x), bannerWidth - width - pad);
  const y = Math.min(Math.max(pad, p.y), bannerHeight - height - pad);
  return { x, y, width, height };
}

export function assetAtCorner(
  assetId: string,
  kind: BannerAssetPlacement["kind"],
  corner: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right",
  assetW: number,
  assetH: number,
  bannerW: number,
  bannerH: number,
  zIndex: number,
): BannerAssetPlacement {
  const pad = safeInset(bannerW, bannerH);
  const positions: Record<typeof corner, { x: number; y: number }> = {
    "top-left": { x: pad, y: pad },
    "top-right": { x: bannerW - assetW - pad, y: pad },
    center: { x: (bannerW - assetW) / 2, y: (bannerH - assetH) / 2 },
    "bottom-left": { x: pad, y: bannerH - assetH - pad },
    "bottom-right": { x: bannerW - assetW - pad, y: bannerH - assetH - pad },
  };
  const { x, y } = positions[corner];
  return {
    assetId,
    kind,
    visible: true,
    x: Math.round(x),
    y: Math.round(y),
    width: assetW,
    height: assetH,
    opacity: 1,
    rotation: 0,
    zIndex,
    fit: kind === "background" ? "cover" : "contain",
    borderRadius: kind === "product" ? 4 : 0,
    shadow: kind === "product",
  };
}

export function fitBackgroundPlacement(
  assetId: string,
  bannerW: number,
  bannerH: number,
): BannerAssetPlacement {
  return {
    assetId,
    kind: "background",
    visible: true,
    x: 0,
    y: 0,
    width: bannerW,
    height: bannerH,
    opacity: 1,
    rotation: 0,
    zIndex: 1,
    fit: "cover",
    borderRadius: 0,
    shadow: false,
  };
}

export function centerHorizontally<T extends { x: number; width: number }>(
  p: T,
  bannerW: number,
): T {
  return { ...p, x: Math.round((bannerW - p.width) / 2) };
}

export function centerVertically<T extends { y: number; height: number }>(
  p: T,
  bannerH: number,
): T {
  return { ...p, y: Math.round((bannerH - p.height) / 2) };
}

export function staggerEntranceAnimations(): LayerAnimation[] {
  return defaultLayerAnimations().map((a) => {
    const starts: Record<string, number> = {
      logo: 0,
      product: 200,
      headline: 450,
      subheadline: 700,
      cta: 950,
    };
    return {
      ...a,
      enabled: true,
      startMs: starts[a.layerId] ?? a.startMs,
      preset: a.layerId === "cta" ? "soft-pulse" : a.preset === "none" ? "fade-in" : a.preset,
    };
  });
}

export function noAnimations(): LayerAnimation[] {
  return defaultLayerAnimations().map((a) => ({
    ...a,
    enabled: false,
    preset: "none",
  }));
}

export function subtleAnimations(): LayerAnimation[] {
  return defaultLayerAnimations().map((a) => ({
    ...a,
    enabled: true,
    preset: "fade-in",
    durationMs: 500,
    startMs: a.layerId === "logo" ? 0 : a.layerId === "headline" ? 200 : 350,
    distancePx: 6,
  }));
}

export function energeticAnimations(): LayerAnimation[] {
  return defaultLayerAnimations().map((a) => ({
    ...a,
    enabled: true,
    durationMs: Math.min(a.durationMs + 150, 900),
    distancePx: 18,
    preset:
      a.layerId === "product"
        ? "slide-in-right"
        : a.layerId === "cta"
          ? "bounce-in"
          : a.preset,
  }));
}
