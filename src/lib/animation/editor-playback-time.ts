import type { BannerScene } from "@/types/animation";

/** Global storyboard time (ms) for a scene-local playhead position. */
export function globalPlaybackTimeFromSceneLocal(
  scenes: BannerScene[],
  sceneId: string,
  localMs: number,
): number {
  let offset = 0;
  for (const scene of scenes) {
    if (scene.id === sceneId) return offset + Math.max(0, localMs);
    offset += scene.durationMs;
  }
  return Math.max(0, localMs);
}

export function playbackSceneIdAtGlobalTime(
  scenes: BannerScene[],
  globalMs: number,
): string | null {
  if (scenes.length === 0) return null;
  let offset = 0;
  for (const scene of scenes) {
    if (globalMs >= offset && globalMs < offset + scene.durationMs) return scene.id;
    offset += scene.durationMs;
  }
  return scenes[scenes.length - 1]?.id ?? null;
}

export function clampSceneLocalPlaybackTime(
  scenes: BannerScene[],
  sceneId: string,
  localMs: number,
): number {
  const scene = scenes.find((s) => s.id === sceneId);
  const max = scene?.durationMs ?? 0;
  return Math.max(0, Math.min(max, localMs));
}

export function clampGlobalPlaybackTime(
  scenes: BannerScene[],
  globalMs: number,
): number {
  const total = scenes.reduce((sum, s) => sum + s.durationMs, 0);
  return Math.max(0, Math.min(total, globalMs));
}
