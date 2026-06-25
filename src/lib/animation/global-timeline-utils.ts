import type { BannerScene, BannerSceneTransition } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import {
  getSceneTransitionDurationMs,
  sceneStartOffsetMs,
  totalStoryboardDurationMs,
} from "@/lib/animation/storyboard-utils";
import { transitionFriendlyLabel } from "@/lib/animation/effect-labels";

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
  const label = transitionFriendlyLabel(scene.transitionOut);
  const durSec = (getSceneTransitionDurationMs(scene) / 1000).toFixed(1);
  return `${label} · ${durSec} s`;
}

export function isInTransitionRange(
  state: BannerEditorState,
  globalMs: number,
): boolean {
  const segments = buildGlobalTimelineSegments(state);
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    if (
      globalMs >= seg.transitionStartGlobalMs &&
      globalMs < seg.endGlobalMs
    ) {
      return true;
    }
  }
  return false;
}
