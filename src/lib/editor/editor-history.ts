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

export interface HistoryStacks<T> {
  past: T[];
  future: T[];
}

export type EditorHistoryStacks = HistoryStacks<BannerEditorState>;

export function createEmptyHistoryStacks<T>(): HistoryStacks<T> {
  return { past: [], future: [] };
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
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
  stacks: HistoryStacks<unknown>;
  coalesceActive: boolean;
  lastCoalesceAt: number;
}

export function applyHistoryUpdate<T>(
  stacks: HistoryStacks<T>,
  prev: T,
  next: T,
  isEqual: (a: T, b: T) => boolean,
  clone: (state: T) => T,
  options: ApplyHistoryOptions = {},
): ApplyHistoryResult & { stacks: HistoryStacks<T> } {
  const mode = options.mode ?? "push";
  const now = options.now ?? Date.now();
  let coalesceActive = options.coalesceActive ?? false;
  let lastCoalesceAt = options.lastCoalesceAt ?? 0;

  if (isEqual(prev, next)) {
    return { stacks, coalesceActive, lastCoalesceAt };
  }

  if (mode === "skip") {
    return { stacks, coalesceActive, lastCoalesceAt };
  }

  if (mode === "replace") {
    const gap = now - lastCoalesceAt;
    if (!coalesceActive || gap > EDITOR_HISTORY_COALESCE_MS) {
      const past = [...stacks.past, clone(prev)].slice(-EDITOR_HISTORY_MAX);
      coalesceActive = true;
      lastCoalesceAt = now;
      return { stacks: { past, future: [] }, coalesceActive, lastCoalesceAt };
    }
    lastCoalesceAt = now;
    return { stacks: { ...stacks, future: [] }, coalesceActive, lastCoalesceAt };
  }

  coalesceActive = false;
  lastCoalesceAt = 0;
  const past = [...stacks.past, clone(prev)].slice(-EDITOR_HISTORY_MAX);
  return {
    stacks: { past, future: [] },
    coalesceActive,
    lastCoalesceAt,
  };
}

export function undoHistoryStack<T>(
  stacks: HistoryStacks<T>,
  present: T,
  clone: (state: T) => T,
  restore: (state: T) => T,
): { stacks: HistoryStacks<T>; state: T } | null {
  if (stacks.past.length === 0) return null;
  const previous = stacks.past[stacks.past.length - 1]!;
  const past = stacks.past.slice(0, -1);
  const future = [clone(present), ...stacks.future].slice(0, EDITOR_HISTORY_MAX);
  return {
    stacks: { past, future },
    state: restore(previous),
  };
}

export function redoHistoryStack<T>(
  stacks: HistoryStacks<T>,
  present: T,
  clone: (state: T) => T,
  restore: (state: T) => T,
): { stacks: HistoryStacks<T>; state: T } | null {
  if (stacks.future.length === 0) return null;
  const [next, ...restFuture] = stacks.future;
  const past = [...stacks.past, clone(present)].slice(-EDITOR_HISTORY_MAX);
  return {
    stacks: { past, future: restFuture },
    state: restore(next!),
  };
}

export function applyHistoryForUpdate(
  stacks: EditorHistoryStacks,
  prev: BannerEditorState,
  next: BannerEditorState,
  options: ApplyHistoryOptions = {},
): ApplyHistoryResult & { stacks: EditorHistoryStacks } {
  return applyHistoryUpdate(
    stacks,
    prev,
    next,
    editorStatesEqual,
    cloneEditorStateForHistory,
    options,
  );
}

export function undoHistory(
  stacks: EditorHistoryStacks,
  present: BannerEditorState,
): { stacks: EditorHistoryStacks; state: BannerEditorState } | null {
  return undoHistoryStack(
    stacks,
    present,
    cloneEditorStateForHistory,
    restoreEditorStateFromHistory,
  );
}

export function redoHistory(
  stacks: EditorHistoryStacks,
  present: BannerEditorState,
): { stacks: EditorHistoryStacks; state: BannerEditorState } | null {
  return redoHistoryStack(
    stacks,
    present,
    cloneEditorStateForHistory,
    restoreEditorStateFromHistory,
  );
}
