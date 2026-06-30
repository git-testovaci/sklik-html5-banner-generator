import type { BannerSceneTransition } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import {
  sceneStartOffsetMs,
  totalStoryboardDurationMs,
  transitionDurationForScene,
  transitionKeyframes,
} from "@/lib/animation/storyboard-utils";

export const SCENE_TRANSITION_MS = 700;

interface FrameState {
  opacity: number;
  visibility: "visible" | "hidden";
  transform: string;
}

function toPct(ms: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (ms / total) * 100));
}

function restFrame(): FrameState {
  return { opacity: 1, visibility: "visible", transform: "translate(0, 0)" };
}

function hiddenFrame(): FrameState {
  return { opacity: 0, visibility: "hidden", transform: "translate(0, 0)" };
}

function enterStartFrame(transition: BannerSceneTransition): FrameState {
  switch (transition) {
    case "swipe-left":
    case "push-left":
      return { opacity: 1, visibility: "visible", transform: "translateX(100%)" };
    case "swipe-right":
    case "push-right":
      return { opacity: 1, visibility: "visible", transform: "translateX(-100%)" };
    case "swipe-up":
      return { opacity: 1, visibility: "visible", transform: "translateY(100%)" };
    case "swipe-down":
      return { opacity: 1, visibility: "visible", transform: "translateY(-100%)" };
    case "fade":
    default:
      return { opacity: 0, visibility: "visible", transform: "translate(0, 0)" };
  }
}

function exitEndFrame(transition: BannerSceneTransition): FrameState {
  switch (transition) {
    case "swipe-left":
    case "push-left":
      return { opacity: 1, visibility: "visible", transform: "translateX(-100%)" };
    case "swipe-right":
    case "push-right":
      return { opacity: 1, visibility: "visible", transform: "translateX(100%)" };
    case "swipe-up":
      return { opacity: 1, visibility: "visible", transform: "translateY(-100%)" };
    case "swipe-down":
      return { opacity: 1, visibility: "visible", transform: "translateY(100%)" };
    case "fade":
    default:
      return { opacity: 0, visibility: "visible", transform: "translate(0, 0)" };
  }
}

function frameCss(state: FrameState): string {
  const pe = state.visibility === "hidden" ? "pointer-events: none;" : "";
  return `opacity: ${state.opacity}; visibility: ${state.visibility}; transform: ${state.transform}; ${pe}`;
}

function pushKeyframe(
  map: Map<string, FrameState>,
  pct: number,
  state: FrameState,
): void {
  const key = pct.toFixed(3);
  map.set(key, state);
}

function renderKeyframes(map: Map<string, FrameState>): string {
  const entries = [...map.entries()]
    .map(([k, v]) => ({ pct: Number(k), css: frameCss(v) }))
    .sort((a, b) => a.pct - b.pct);
  return entries.map((e) => `${e.pct}% { ${e.css} }`).join("\n  ");
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface SceneTransitionPose {
  opacity: number;
  transform: string;
}

/** Editor preview pose for the outgoing scene during a transition (progress 0–1). */
export function sourceSceneTransitionPose(
  transition: BannerSceneTransition,
  progress: number,
): SceneTransitionPose {
  const t = Math.max(0, Math.min(1, progress));
  switch (transition) {
    case "swipe-left":
    case "push-left":
      return { opacity: 1, transform: `translateX(${lerp(0, -100, t)}%)` };
    case "swipe-right":
    case "push-right":
      return { opacity: 1, transform: `translateX(${lerp(0, 100, t)}%)` };
    case "swipe-up":
      return { opacity: 1, transform: `translateY(${lerp(0, -100, t)}%)` };
    case "swipe-down":
      return { opacity: 1, transform: `translateY(${lerp(0, 100, t)}%)` };
    case "fade":
    case "none":
    default:
      return { opacity: lerp(1, 0, t), transform: "translate(0, 0)" };
  }
}

/** Editor preview pose for the incoming scene during a transition (progress 0–1). */
export function targetSceneTransitionPose(
  transition: BannerSceneTransition,
  progress: number,
): SceneTransitionPose {
  const t = Math.max(0, Math.min(1, progress));
  switch (transition) {
    case "swipe-left":
    case "push-left":
      return { opacity: 1, transform: `translateX(${lerp(100, 0, t)}%)` };
    case "swipe-right":
    case "push-right":
      return { opacity: 1, transform: `translateX(${lerp(-100, 0, t)}%)` };
    case "swipe-up":
      return { opacity: 1, transform: `translateY(${lerp(100, 0, t)}%)` };
    case "swipe-down":
      return { opacity: 1, transform: `translateY(${lerp(-100, 0, t)}%)` };
    case "fade":
    case "none":
    default:
      return { opacity: lerp(0, 1, t), transform: "translate(0, 0)" };
  }
}

export function buildSceneSequenceCss(
  state: BannerEditorState,
  replayKey: number,
  loop: boolean,
  classPrefix = "scene-seq",
): string {
  const scenes = state.scenes ?? [];
  if (scenes.length <= 1) return transitionKeyframes();

  const total = totalStoryboardDurationMs(state);
  const iter = loop ? "infinite" : 1;
  const rules: string[] = [transitionKeyframes()];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const startMs = sceneStartOffsetMs(state, scene.id);
    const endMs = startMs + scene.durationMs;
    const transition =
      scene.transitionOut === "none" && i < scenes.length - 1
        ? "fade"
        : scene.transitionOut;
    const transMs = sceneTransitionWindowMs(scene.durationMs, scene);
    const transStartMs = endMs - transMs;
    const isLast = i === scenes.length - 1;
    const prevTransition =
      i > 0
        ? scenes[i - 1].transitionOut === "none"
          ? "fade"
          : scenes[i - 1].transitionOut
        : null;

    const startPct = toPct(startMs, total);
    const prevTransMs =
      i > 0
        ? sceneTransitionWindowMs(scenes[i - 1].durationMs, scenes[i - 1])
        : 0;
    const prevEndMs =
      i > 0
        ? sceneStartOffsetMs(state, scenes[i - 1].id) + scenes[i - 1].durationMs
        : 0;
    const actualEnterPct =
      i > 0 ? toPct(prevEndMs - prevTransMs, total) : startPct;
    const transStartPct = toPct(transStartMs, total);
    const endPct = toPct(endMs, total);
    const hidePct = Math.min(100, endPct + 0.2);

    const frames = new Map<string, FrameState>();
    pushKeyframe(frames, 0, hiddenFrame());

    if (i === 0) {
      if (startPct > 0) {
        pushKeyframe(frames, Math.max(0, startPct - 0.05), hiddenFrame());
      }
      pushKeyframe(frames, startPct, restFrame());
    } else if (prevTransition) {
      pushKeyframe(frames, Math.max(0, actualEnterPct - 0.05), hiddenFrame());
      pushKeyframe(frames, actualEnterPct, enterStartFrame(prevTransition));
      pushKeyframe(frames, startPct, restFrame());
    }

    if (transStartPct > startPct + 0.05) {
      pushKeyframe(frames, transStartPct, restFrame());
    }

    if (!isLast || loop) {
      if (transition !== "none") {
        pushKeyframe(frames, endPct, exitEndFrame(transition));
      }
      pushKeyframe(frames, hidePct, hiddenFrame());
      pushKeyframe(frames, 100, hiddenFrame());
    } else {
      pushKeyframe(frames, endPct, restFrame());
      pushKeyframe(frames, 100, restFrame());
    }

    const cls = `${classPrefix}-${scene.id}-${replayKey}`;
    rules.push(`
@keyframes ${cls} {
  ${renderKeyframes(frames)}
}
.${cls} {
  animation: ${cls} ${total}ms linear ${iter};
  will-change: transform, opacity;
}`);
  }

  return rules.join("\n");
}

export function sceneTransitionWindowMs(
  sceneDurationMs: number,
  scene?: { transitionDurationMs?: number; durationMs?: number },
): number {
  if (scene) {
    return transitionDurationForScene(
      scene.durationMs ?? sceneDurationMs,
      scene.transitionDurationMs,
    );
  }
  return Math.min(SCENE_TRANSITION_MS, Math.max(320, Math.round(sceneDurationMs * 0.22)));
}
