import { isVideoMimeType } from "@/lib/assets/asset-validation";
import { animationTargetIdForLayer } from "@/lib/animation/layer-instance-utils";
import { buildPhaseLayerAnimationsForScene } from "@/lib/animation/layer-phase-utils";
import {
  getLayerTimelineRange,
  getOrderedSceneLayersForUi,
} from "@/lib/animation/layer-timeline-utils";
import {
  getLayerById,
  getLayersForScene,
  getSceneById,
  totalStoryboardDurationMs,
} from "@/lib/animation/storyboard-utils";
import type { LayerAnimation } from "@/types/animation";
import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";

export const LEGACY_FLAT_SCENE_ID = "__flat__";

const RENDERABLE_TYPES = new Set([
  "text",
  "image",
  "badge",
  "shape",
  "particle",
  "underline",
]);

export function isExportableImageMime(mimeType: string): boolean {
  return [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
  ].includes(mimeType);
}

/** @deprecated Use isVideoMimeType from asset-validation */
export { isVideoMimeType } from "@/lib/assets/asset-validation";

/** Scene list for export — includes synthetic scene for legacy flat projects. */
export function resolveExportScenes(state: BannerEditorState) {
  const scenes = state.scenes ?? [];
  if (scenes.length > 0) return scenes;
  return [
    {
      id: LEGACY_FLAT_SCENE_ID,
      name: "Scene 1",
      durationMs: state.timeline?.durationMs ?? 3000,
      layerIds: [] as string[],
      transitionOut: "none" as const,
      transitionDurationMs: 0,
      createdAt: "",
      updatedAt: "",
    },
  ];
}

export function isLegacyFlatScene(sceneId: string): boolean {
  return sceneId === LEGACY_FLAT_SCENE_ID;
}

function layerFromLegacyFlat(state: BannerEditorState): BannerLayer[] {
  const layers: BannerLayer[] = [];
  for (const pl of state.textPlacements ?? []) {
    if (!pl.visible) continue;
    layers.push({
      id: pl.layerId,
      name: pl.layerId,
      type: "text",
      visible: pl.visible,
      locked: false,
      persistent: false,
      x: pl.x,
      y: pl.y,
      width: pl.width,
      height: pl.height,
      opacity: pl.opacity,
      rotation: pl.rotation,
      zIndex: pl.zIndex,
      fontSize: pl.fontSize,
      fontWeight: pl.fontWeight,
      lineHeight: pl.lineHeight,
      textAlign: pl.textAlign,
      legacyKey: pl.layerId as BannerLayer["legacyKey"],
      scale: 1,
    });
  }
  for (const pl of state.assetPlacements ?? []) {
    if (!pl.visible) continue;
    layers.push({
      id: pl.bannerLayerId ?? pl.assetId,
      name: pl.kind,
      type: "image",
      visible: pl.visible,
      locked: false,
      persistent: false,
      x: pl.x,
      y: pl.y,
      width: pl.width,
      height: pl.height,
      opacity: pl.opacity,
      rotation: pl.rotation,
      zIndex: pl.zIndex,
      assetId: pl.assetId,
      fit: pl.fit,
      borderRadius: pl.borderRadius,
      shadow: pl.shadow,
      legacyKey: pl.kind === "decoration" ? undefined : pl.kind,
      scale: 1,
    });
  }
  return layers.sort((a, b) => a.zIndex - b.zIndex);
}

/** Layers to render in export for one scene — visible only, stacked bottom-to-top. */
export function getExportLayersForScene(
  state: BannerEditorState,
  sceneId: string,
): BannerLayer[] {
  if (isLegacyFlatScene(sceneId)) {
    return layerFromLegacyFlat(state);
  }

  const ordered = getOrderedSceneLayersForUi(state, sceneId);
  const fromOrder = ordered.filter(
    (l) =>
      l.visible &&
      RENDERABLE_TYPES.has(l.type) &&
      getLayerById(state, l.id),
  );
  if (fromOrder.length > 0) {
    return [...fromOrder].sort((a, b) => a.zIndex - b.zIndex);
  }

  return getLayersForScene(state, sceneId)
    .filter((l) => l.visible && RENDERABLE_TYPES.has(l.type))
    .sort((a, b) => a.zIndex - b.zIndex);
}

export function exportAnimationTargetId(layer: BannerLayer): string {
  return animationTargetIdForLayer(layer, layer.id);
}

export function exportLayerDomId(layer: BannerLayer): string {
  return layer.id.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function exportLayerVisibilityClass(layer: BannerLayer): string {
  return `layer-vis-${exportLayerDomId(layer)}`;
}

/** Collect layer animations from every export scene (not active scene only). */
export function collectExportLayerAnimations(state: BannerEditorState): LayerAnimation[] {
  const scenes = resolveExportScenes(state);
  const anims: LayerAnimation[] = [];
  const seen = new Set<string>();

  for (const scene of scenes) {
    if (isLegacyFlatScene(scene.id)) {
      for (const anim of state.layerAnimations ?? []) {
        if (!anim.enabled || anim.preset === "none") continue;
        const key = `${anim.layerId}:${anim.preset}:${anim.startMs}:${anim.phase ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        anims.push(anim);
      }
      continue;
    }
    for (const anim of buildPhaseLayerAnimationsForScene(state, scene.id)) {
      if (!anim.enabled || anim.preset === "none") continue;
      if (!getLayerById(state, anim.layerId)) continue;
      const key = `${scene.id}:${anim.layerId}:${anim.preset}:${anim.startMs}:${anim.phase ?? ""}:${anim.phaseUiPresetId ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      anims.push(anim);
    }
  }

  return anims;
}

/** CSS keyframes + rule hiding layer outside its timeline window. */
export function buildLayerTimelineVisibilityCss(
  state: BannerEditorState,
  sceneId: string,
  layer: BannerLayer,
): string | null {
  const scene = isLegacyFlatScene(sceneId)
    ? { durationMs: state.timeline?.durationMs ?? 3000 }
    : getSceneById(state, sceneId);
  if (!scene || scene.durationMs <= 0) return null;

  const range = isLegacyFlatScene(sceneId)
    ? { startMs: 0, durationMs: scene.durationMs, fromEffects: false }
    : getLayerTimelineRange(state, sceneId, layer.id);

  if (range.startMs <= 0 && range.durationMs >= scene.durationMs - 1) {
    return null;
  }

  const dur = scene.durationMs;
  const startPct = (range.startMs / dur) * 100;
  const endMs = range.startMs + range.durationMs;
  const endPct = Math.min(100, (endMs / dur) * 100);
  const fadeIn = Math.min(startPct + 0.05, endPct);
  const fadeOut = Math.min(endPct + 0.05, 100);
  const kfName = `kf-vis-${exportLayerDomId(layer)}`;
  const cls = exportLayerVisibilityClass(layer);
  const baseOpacity = layer.opacity;

  return `@keyframes ${kfName} {
  0%, ${startPct.toFixed(3)}% { opacity: 0; visibility: hidden; }
  ${fadeIn.toFixed(3)}%, ${endPct.toFixed(3)}% { opacity: ${baseOpacity}; visibility: visible; }
  ${fadeOut.toFixed(3)}%, 100% { opacity: 0; visibility: hidden; }
}
.${cls} { animation: ${kfName} ${dur}ms linear forwards; opacity: 0; }`;
}

export function collectExportVisibilityCss(
  state: BannerEditorState,
): string {
  const parts: string[] = [];
  for (const scene of resolveExportScenes(state)) {
    for (const layer of getExportLayersForScene(state, scene.id)) {
      const css = buildLayerTimelineVisibilityCss(state, scene.id, layer);
      if (css) parts.push(css);
    }
  }
  return parts.join("\n");
}

export function sceneHasBackgroundImage(
  state: BannerEditorState,
  sceneId: string,
): boolean {
  return getExportLayersForScene(state, sceneId).some(
    (l) =>
      l.assetId &&
      (l.legacyKey === "background" ||
        (state.assets ?? []).find((a) => a.id === l.assetId)?.kind === "background"),
  );
}

export function projectHasBackgroundImage(state: BannerEditorState): boolean {
  for (const scene of resolveExportScenes(state)) {
    if (sceneHasBackgroundImage(state, scene.id)) return true;
  }
  return (state.assetPlacements ?? []).some(
    (p) => p.visible && p.kind === "background",
  );
}

export interface ExportProjectStats {
  sceneCount: number;
  layerCount: number;
  visibleLayerCount: number;
  assetFileCount: number;
  assetInstanceCount: number;
  uniqueAssetIds: number;
  totalDurationMs: number;
}

export function collectExportProjectStats(
  state: BannerEditorState,
  assetFileCount = 0,
): ExportProjectStats {
  const scenes = resolveExportScenes(state);
  let layerCount = 0;
  let visibleLayerCount = 0;
  const assetIds = new Set<string>();
  let assetInstanceCount = 0;

  for (const scene of scenes) {
    const layers = getExportLayersForScene(state, scene.id);
    layerCount += layers.length;
    for (const layer of layers) {
      if (layer.visible) visibleLayerCount++;
      if (layer.assetId) {
        assetIds.add(layer.assetId);
        assetInstanceCount++;
      }
    }
  }

  if (layerCount === 0 && (state.bannerLayers ?? []).length > 0) {
    layerCount = (state.bannerLayers ?? []).filter((l) => l.visible).length;
    visibleLayerCount = layerCount;
  }

  const totalDurationMs =
    scenes.length > 1 && (state.scenes ?? []).length > 1
      ? totalStoryboardDurationMs(state)
      : scenes[0]?.durationMs ?? state.timeline?.durationMs ?? 3000;

  return {
    sceneCount: scenes.length,
    layerCount,
    visibleLayerCount,
    assetFileCount,
    assetInstanceCount,
    uniqueAssetIds: assetIds.size,
    totalDurationMs,
  };
}

export function collectUsedExportAssetIds(state: BannerEditorState): Set<string> {
  const ids = new Set<string>();
  for (const scene of resolveExportScenes(state)) {
    for (const layer of getExportLayersForScene(state, scene.id)) {
      if (layer.visible && layer.assetId) ids.add(layer.assetId);
    }
  }
  if (ids.size === 0) {
    for (const p of (state.assetPlacements ?? []).filter((pl) => pl.visible)) {
      ids.add(p.assetId);
    }
  }
  return ids;
}

export function findVideoAssets(state: BannerEditorState) {
  return (state.assets ?? []).filter((a) => isVideoMimeType(a.mimeType));
}

export function layerExportAnimClass(
  anims: LayerAnimation[],
  layer: BannerLayer,
): string {
  const targetId = exportAnimationTargetId(layer);
  const matched = anims.filter(
    (a) => a.enabled && a.preset !== "none" && a.layerId === targetId,
  );
  if (matched.length === 0) return "";
  const safe = targetId.replace(/[^a-zA-Z0-9_-]/g, "-");
  if (matched.length > 1) return ` anim-group-${safe}`;
  return ` anim-layer-${safe}`;
}

export function getLayerByIdForExport(
  state: BannerEditorState,
  layerId: string,
): BannerLayer | undefined {
  return getLayerById(state, layerId);
}
