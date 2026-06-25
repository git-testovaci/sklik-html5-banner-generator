import { normalizeEditorState } from "@/lib/animation/timeline-utils";
import { repairEditorInvariants } from "@/lib/editor/editor-invariants";
import type {
  BannerEditorState,
  BannerEditorStatePatch,
  EditorHistoryMode,
} from "@/types/editor";
import { editorStatesEqual, isEditorStatePatchFn } from "@/types/editor";

export const EDITOR_HISTORY_MAX = 50;

/** Gap after which a new replace/coalesce burst starts a fresh undo step. */
export const EDITOR_HISTORY_COALESCE_MS = 600;

export interface EditorHistoryStacks {
  past: BannerEditorState[];
  future: BannerEditorState[];
}

export function createEmptyHistoryStacks(): EditorHistoryStacks {
  return { past: [], future: [] };
}

export function cloneEditorStateForHistory(state: BannerEditorState): BannerEditorState {
  return normalizeEditorState(structuredClone(state));
}

export function restoreEditorStateFromHistory(state: BannerEditorState): BannerEditorState {
  return normalizeEditorState(repairEditorInvariants(state));
}

export function mergeEditorPatch(
  prev: BannerEditorState,
  patch: Partial<BannerEditorState> | BannerEditorState,
): BannerEditorState {
  return normalizeEditorState({ ...prev, ...patch });
}

export function resolveEditorStatePatch(
  prev: BannerEditorState,
  patch: BannerEditorStatePatch,
): Partial<BannerEditorState> | BannerEditorState {
  return isEditorStatePatchFn(patch) ? patch(prev) : patch;
}

export interface ApplyHistoryOptions {
  mode?: EditorHistoryMode;
  coalesceActive?: boolean;
  lastCoalesceAt?: number;
  now?: number;
}

export interface ApplyHistoryResult {
  stacks: EditorHistoryStacks;
  coalesceActive: boolean;
  lastCoalesceAt: number;
}

export function applyHistoryForUpdate(
  stacks: EditorHistoryStacks,
  prev: BannerEditorState,
  next: BannerEditorState,
  options: ApplyHistoryOptions = {},
): ApplyHistoryResult {
  const mode = options.mode ?? "push";
  const now = options.now ?? Date.now();
  let coalesceActive = options.coalesceActive ?? false;
  let lastCoalesceAt = options.lastCoalesceAt ?? 0;

  if (editorStatesEqual(prev, next)) {
    return { stacks, coalesceActive, lastCoalesceAt };
  }

  if (mode === "skip") {
    return { stacks, coalesceActive, lastCoalesceAt };
  }

  if (mode === "replace") {
    const gap = now - lastCoalesceAt;
    if (!coalesceActive || gap > EDITOR_HISTORY_COALESCE_MS) {
      const past = [...stacks.past, cloneEditorStateForHistory(prev)].slice(-EDITOR_HISTORY_MAX);
      coalesceActive = true;
      lastCoalesceAt = now;
      return { stacks: { past, future: [] }, coalesceActive, lastCoalesceAt };
    }
    lastCoalesceAt = now;
    return { stacks: { ...stacks, future: [] }, coalesceActive, lastCoalesceAt };
  }

  coalesceActive = false;
  lastCoalesceAt = 0;
  const past = [...stacks.past, cloneEditorStateForHistory(prev)].slice(-EDITOR_HISTORY_MAX);
  return {
    stacks: { past, future: [] },
    coalesceActive,
    lastCoalesceAt,
  };
}

export function undoHistory(
  stacks: EditorHistoryStacks,
  present: BannerEditorState,
): { stacks: EditorHistoryStacks; state: BannerEditorState } | null {
  if (stacks.past.length === 0) return null;
  const previous = stacks.past[stacks.past.length - 1]!;
  const past = stacks.past.slice(0, -1);
  const future = [cloneEditorStateForHistory(present), ...stacks.future].slice(
    0,
    EDITOR_HISTORY_MAX,
  );
  return {
    stacks: { past, future },
    state: restoreEditorStateFromHistory(previous),
  };
}

export function redoHistory(
  stacks: EditorHistoryStacks,
  present: BannerEditorState,
): { stacks: EditorHistoryStacks; state: BannerEditorState } | null {
  if (stacks.future.length === 0) return null;
  const [next, ...restFuture] = stacks.future;
  const past = [...stacks.past, cloneEditorStateForHistory(present)].slice(-EDITOR_HISTORY_MAX);
  return {
    stacks: { past, future: restFuture },
    state: restoreEditorStateFromHistory(next!),
  };
}
