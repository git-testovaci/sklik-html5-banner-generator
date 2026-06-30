import type { BannerLayer, BannerScene, BannerSceneTransition } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import {
  getSceneTransitionDurationMs,
  sceneStartOffsetMs,
  totalStoryboardDurationMs,
} from "@/lib/animation/storyboard-utils";
import { transitionFriendlyLabel } from "@/lib/animation/effect-labels";
import {
  getLayerTimelineRange,
  getTimelineLayersForScene,
  layerTimelineLabel,
} from "@/lib/animation/layer-timeline-utils";

/**
 * Editor / playback global timeline API.
 * Prefer these names in UI and playback code.
 * Export pipeline may continue using totalStoryboardDurationMs / sceneStartOffsetMs.
 */
export interface GlobalTimelineSceneSegment {
  sceneId: string;
  index: number;
  name: string;
  startGlobalMs: number;
  endGlobalMs: number;
  durationMs: number;
  transitionOut: BannerSceneTransition;
  transitionDurationMs: number;
  transitionStartGlobalMs: number;
}

export interface SceneAtGlobalTime {
  scene: BannerScene;
  localMs: number;
  globalMs: number;
}

/** Total banner duration — sum of scene durations (transitions overlap at boundaries). */
export function totalBannerDurationMs(state: BannerEditorState): number {
  return totalStoryboardDurationMs(state);
}

export function sceneStartGlobalMs(state: BannerEditorState, sceneId: string): number {
  return sceneStartOffsetMs(state, sceneId);
}

export function sceneEndGlobalMs(state: BannerEditorState, sceneId: string): number {
  const scene = (state.scenes ?? []).find((s) => s.id === sceneId);
  if (!scene) return 0;
  return sceneStartGlobalMs(state, sceneId) + scene.durationMs;
}

export function clampGlobalMs(state: BannerEditorState, globalMs: number): number {
  const total = totalBannerDurationMs(state);
  return Math.max(0, Math.min(total, globalMs));
}

export function buildGlobalTimelineSegments(
  state: BannerEditorState,
): GlobalTimelineSceneSegment[] {
  const scenes = state.scenes ?? [];
  let offset = 0;
  return scenes.map((scene, index) => {
    const startGlobalMs = offset;
    const durationMs = scene.durationMs;
    const endGlobalMs = startGlobalMs + durationMs;
    const transitionDurationMs = getSceneTransitionDurationMs(scene);
    const transitionStartGlobalMs = Math.max(startGlobalMs, endGlobalMs - transitionDurationMs);
    offset += durationMs;
    return {
      sceneId: scene.id,
      index,
      name: scene.name,
      startGlobalMs,
      endGlobalMs,
      durationMs,
      transitionOut: scene.transitionOut,
      transitionDurationMs,
      transitionStartGlobalMs,
    };
  });
}

export function sceneAtGlobalMs(
  state: BannerEditorState,
  globalMs: number,
): SceneAtGlobalTime | null {
  const scenes = state.scenes ?? [];
  if (scenes.length === 0) return null;
  const clamped = clampGlobalMs(state, globalMs);
  let offset = 0;
  for (const scene of scenes) {
    const end = offset + scene.durationMs;
    if (clamped >= offset && clamped < end) {
      return { scene, localMs: clamped - offset, globalMs: clamped };
    }
    offset = end;
  }
  const last = scenes[scenes.length - 1]!;
  const start = sceneStartGlobalMs(state, last.id);
  return {
    scene: last,
    localMs: Math.min(clamped - start, last.durationMs),
    globalMs: clamped,
  };
}

export function sceneLocalFromGlobal(
  state: BannerEditorState,
  globalMs: number,
): number {
  return sceneAtGlobalMs(state, globalMs)?.localMs ?? 0;
}

export function globalFromSceneLocal(
  state: BannerEditorState,
  sceneId: string,
  localMs: number,
): number {
  return sceneStartGlobalMs(state, sceneId) + Math.max(0, localMs);
}

export function playbackSceneIdAtGlobalMs(
  state: BannerEditorState,
  globalMs: number,
): string | null {
  return sceneAtGlobalMs(state, globalMs)?.scene.id ?? null;
}

export function transitionLabelForScene(scene: BannerScene): string {
  const label =
    scene.transitionOut === "none"
      ? "Žádný"
      : transitionFriendlyLabel(scene.transitionOut);
  const durSec = (getSceneTransitionDurationMs(scene) / 1000).toFixed(1);
  return `${label} · ${durSec} s`;
}

/** Scene that follows the outgoing transition from `sceneId`. */
export function transitionTargetScene(
  state: BannerEditorState,
  sceneId: string,
): BannerScene | undefined {
  const scenes = state.scenes ?? [];
  const idx = scenes.findIndex((s) => s.id === sceneId);
  if (idx < 0 || idx >= scenes.length - 1) return undefined;
  return scenes[idx + 1];
}

/** Percent layout for a transition block in the dedicated PŘECHODY row. */
export function transitionBlockPercentLayout(
  seg: GlobalTimelineSceneSegment,
  totalDurationMs: number,
): { leftPct: number; widthPct: number } {
  if (totalDurationMs <= 0) return { leftPct: 0, widthPct: 0 };
  const boundaryPct = (seg.endGlobalMs / totalDurationMs) * 100;
  const naturalWidth =
    totalDurationMs > 0 ? (seg.transitionDurationMs / totalDurationMs) * 100 : 0;
  const widthPct = Math.max(naturalWidth, 1.8);
  if (seg.transitionDurationMs <= 0) {
    const leftPct = Math.max(0, Math.min(100 - widthPct, boundaryPct - widthPct / 2));
    return { leftPct, widthPct };
  }
  const leftPct = (seg.transitionStartGlobalMs / totalDurationMs) * 100;
  return { leftPct, widthPct: Math.min(widthPct, 100 - leftPct) };
}

/** @deprecated Use transitionBlockPercentLayout — kept for callers outside timeline UI. */
export function transitionChipPercentLayout(
  seg: GlobalTimelineSceneSegment,
  totalDurationMs: number,
): { leftPct: number; widthPct: number } {
  return transitionBlockPercentLayout(seg, totalDurationMs);
}

export interface TransitionAtGlobalTime {
  sourceScene: BannerScene;
  targetScene: BannerScene;
  sourceSceneId: string;
  transitionOut: BannerSceneTransition;
  transitionStartGlobalMs: number;
  transitionEndGlobalMs: number;
  durationMs: number;
  localTransitionMs: number;
  progress: number;
}

/** Active outgoing scene transition at a global playhead position, if any. */
export function getTransitionAtGlobalMs(
  state: BannerEditorState,
  globalMs: number,
): TransitionAtGlobalTime | null {
  const segments = buildGlobalTimelineSegments(state);
  const clamped = clampGlobalMs(state, globalMs);
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    if (seg.transitionDurationMs <= 0 || seg.transitionOut === "none") continue;
    const transStart = seg.transitionStartGlobalMs;
    const transEnd = seg.endGlobalMs;
    if (clamped >= transStart && clamped < transEnd) {
      const sourceScene = (state.scenes ?? [])[i];
      const targetScene = (state.scenes ?? [])[i + 1];
      if (!sourceScene || !targetScene) return null;
      const durationMs = seg.transitionDurationMs;
      const localTransitionMs = clamped - transStart;
      return {
        sourceScene,
        targetScene,
        sourceSceneId: seg.sceneId,
        transitionOut: seg.transitionOut,
        transitionStartGlobalMs: transStart,
        transitionEndGlobalMs: transEnd,
        durationMs,
        localTransitionMs,
        progress: durationMs > 0 ? localTransitionMs / durationMs : 0,
      };
    }
  }
  return null;
}

export function transitionSelectionAriaLabel(
  state: BannerEditorState,
  sourceSceneId: string,
): string {
  const scenes = state.scenes ?? [];
  const idx = scenes.findIndex((s) => s.id === sourceSceneId);
  const source = scenes[idx];
  const target = scenes[idx + 1];
  if (!source || !target) return "Upravit přechod";
  return `Upravit přechod ${source.name} → ${target.name}`;
}

export interface GlobalTimelineLayerRow {
  layer: BannerLayer;
  sceneId: string;
  sceneName: string;
  sceneIndex: number;
  sceneStartGlobalMs: number;
  sceneDurationMs: number;
  localStartMs: number;
  localDurationMs: number;
  globalStartMs: number;
  globalDurationMs: number;
}

/** All editable layer rows across every scene, with global timeline positions. */
export function buildGlobalTimelineLayerRows(
  state: BannerEditorState,
): GlobalTimelineLayerRow[] {
  const rows: GlobalTimelineLayerRow[] = [];
  for (const [index, scene] of (state.scenes ?? []).entries()) {
    const sceneStart = sceneStartGlobalMs(state, scene.id);
    let layers = getTimelineLayersForScene(state, scene.id);
    if (layers.length === 0) {
      layers = (state.bannerLayers ?? []).filter(
        (l) => !l.persistent && l.sceneId === scene.id,
      );
    }
    for (const layer of layers) {
      const range = getLayerTimelineRange(state, scene.id, layer.id);
      rows.push({
        layer,
        sceneId: scene.id,
        sceneName: scene.name,
        sceneIndex: index,
        sceneStartGlobalMs: sceneStart,
        sceneDurationMs: scene.durationMs,
        localStartMs: range.startMs,
        localDurationMs: range.durationMs,
        globalStartMs: sceneStart + range.startMs,
        globalDurationMs: range.durationMs,
      });
    }
  }
  return rows;
}

export function globalTimelineLayerRowLabel(
  sceneName: string,
  layer: BannerLayer,
): string {
  return `${sceneName} · ${layerTimelineLabel(layer)}`;
}

export function resolveLayerSceneId(
  state: BannerEditorState,
  layerId: string,
): string | null {
  const layer = (state.bannerLayers ?? []).find((l) => l.id === layerId);
  return layer?.sceneId ?? null;
}
