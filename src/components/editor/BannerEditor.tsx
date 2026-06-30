"use client";

import Link from "next/link";
import { flushSync } from "react-dom";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useCallback } from "react";
import {
  emptyEditorSelection,
  resolveBannerLayerForSelection,
  resolveSelectedLayer,
  selectionForBannerLayer,
} from "@/lib/animation/selection-utils";
import {
  clearSelectedEffectIfMissing,
  duplicateBannerLayerInScene,
  getActiveScene,
  getLayerById,
  getSceneById,
  getSceneTransitionDurationMs,
  removeLayerFromEditor,
  setActiveScene,
} from "@/lib/animation/storyboard-utils";
import {
  playbackSceneIdAtGlobalMs,
  resolveLayerSceneId,
  sceneAtGlobalMs,
  sceneStartGlobalMs,
  totalBannerDurationMs,
} from "@/lib/animation/global-timeline-utils";
import { nudgeLayerTimelineStart, updateLayerTimelineRange } from "@/lib/animation/layer-timeline-utils";
import { updateLayerPhaseDuration } from "@/lib/animation/layer-phase-utils";
import { createQuickLayer, type QuickAddLayerType } from "@/lib/animation/layer-factory";
import {
  normalizeEditorState,
  projectToEditorState,
  editorStateToProject,
} from "@/lib/animation/timeline-utils";
import { usePlaybackController } from "@/lib/playback/use-playback-controller";
import {
  getProjectByIdSnapshot,
  getStoredProjectById,
  subscribeProjects,
  upsertProject,
} from "@/lib/project-storage";
import { deriveWorkflowGuidance } from "@/lib/editor/workflow-guidance";
import { findFirstTransitionSceneNeedingAttention } from "@/lib/editor/checklist-utils";
import {
  applyHistoryForUpdate,
  createEmptyHistoryStacks,
  mergeEditorPatch,
  redoHistory,
  resolveEditorStatePatch,
  undoHistory,
  type EditorHistoryStacks,
} from "@/lib/editor/editor-history";
import {
  editorStatesEqual,
  type BannerEditorState,
  type BannerEditorStateUpdater,
  type EditorSelection,
  type SelectedLayer,
} from "@/types/editor";
import { AssetLibrary } from "./AssetLibrary";
import { AssetUploadPanel } from "./AssetUploadPanel";
import { AssetWarningsPanel } from "./AssetWarningsPanel";
import { BannerChecklist, type ChecklistAction } from "./BannerChecklist";
import { BannerPreviewStage } from "./BannerPreviewStage";
import { InspectorPanel } from "./InspectorPanel";
import { InspectorEmptyHelp } from "./InspectorEmptyHelp";
import { GlobalBannerTimeline } from "./UnifiedLayerTimeline";
import { SceneStrip } from "./SceneStrip";
import { TemplatePresetsPanel } from "./TemplatePresetsPanel";
import { ValidationExportPanel } from "./ValidationExportPanel";
import { WorkflowGuidanceBox } from "./WorkflowGuidance";
import { EditorTopBar } from "./EditorTopBar";
import { getValidationSummary } from "@/lib/validation-rules";

type LeftTab = "assets" | "templates";

const TAB_LABELS: Record<LeftTab, string> = {
  assets: "Média",
  templates: "Šablony",
};

interface BannerEditorProps {
  projectId: string;
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function useProjectLookup(projectId: string) {
  return useSyncExternalStore(
    subscribeProjects,
    () => getProjectByIdSnapshot(projectId),
    () => undefined,
  );
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

interface BannerEditorInnerProps {
  initialState: BannerEditorState;
  projectId: string;
}

function BannerEditorInner({ initialState, projectId }: BannerEditorInnerProps) {
  const [state, setState] = useState<BannerEditorState>(() =>
    normalizeEditorState(initialState),
  );
  const [savedState, setSavedState] = useState<BannerEditorState>(() =>
    normalizeEditorState(initialState),
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<SelectedLayer>(() =>
    emptyEditorSelection(),
  );
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("templates");
  const [showExport, setShowExport] = useState(false);
  const [placementMessage, setPlacementMessage] = useState<string | null>(null);
  const [selectedTransitionSceneId, setSelectedTransitionSceneId] = useState<string | null>(null);
  const [scrubTimeMs, setScrubTimeMs] = useState(0);
  const [dismissedGuidanceId, setDismissedGuidanceId] = useState<string | null>(null);
  const copiedLayerIdRef = useRef<string | null>(null);
  const historyRef = useRef<EditorHistoryStacks>(createEmptyHistoryStacks());
  const historyCoalesceRef = useRef(false);
  const historyCoalesceAtRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryAvailability = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  const workflowGuidance = useMemo(() => deriveWorkflowGuidance(state), [state]);
  const activeGuidance =
    workflowGuidance && workflowGuidance.id !== dismissedGuidanceId
      ? workflowGuidance
      : null;

  const totalDurationMs = totalBannerDurationMs(state);

  const resolveSceneAtGlobal = useCallback(
    (globalMs: number) => playbackSceneIdAtGlobalMs(state, globalMs),
    [state],
  );

  const playback = usePlaybackController({
    totalDurationMs,
    loop: state.timeline?.loop ?? false,
    resolveSceneIdAtGlobalMs: resolveSceneAtGlobal,
  });

  const activeScene = getActiveScene(state);

  /** Global banner playhead — single source of truth for timeline + preview. */
  const globalPlayheadMs = playback.isPlaying ? playback.playbackTimeMs : scrubTimeMs;

  const previewAtGlobal = useMemo(
    () => sceneAtGlobalMs(state, globalPlayheadMs),
    [state, globalPlayheadMs],
  );

  const previewSceneId = previewAtGlobal?.scene.id ?? activeScene?.id;
  const previewSceneLocalMs = previewAtGlobal?.localMs ?? 0;

  const gatePreviewByTime = !playback.isPlaying;

  const onUpdate = useCallback<BannerEditorStateUpdater>((patch, options) => {
    setState((prev) => {
      const partial = resolveEditorStatePatch(prev, patch);
      const next = mergeEditorPatch(prev, partial);
      if (editorStatesEqual(prev, next)) {
        return prev;
      }

      const historyResult = applyHistoryForUpdate(
        historyRef.current,
        prev,
        next,
        {
          mode: options?.history,
          coalesceActive: historyCoalesceRef.current,
          lastCoalesceAt: historyCoalesceAtRef.current,
        },
      );
      historyRef.current = historyResult.stacks;
      historyCoalesceRef.current = historyResult.coalesceActive;
      historyCoalesceAtRef.current = historyResult.lastCoalesceAt;

      setSelectedLayer((sel) => resolveSelectedLayer(next, sel));
      setSelectedEffectId((id) => clearSelectedEffectIfMissing(next, id));
      syncHistoryAvailability();
      return next;
    });
    setSaveStatus("idle");
    setSaveError(null);
  }, [syncHistoryAvailability]);

  useEffect(() => {
    const located = sceneAtGlobalMs(state, globalPlayheadMs);
    if (!located || located.scene.id === state.activeSceneId) return;
    onUpdate(setActiveScene(state, located.scene.id), { history: "skip" });
  }, [globalPlayheadMs, state, state.activeSceneId, onUpdate]);

  const handleUndo = useCallback(() => {
    setState((present) => {
      const result = undoHistory(historyRef.current, present);
      if (!result) return present;
      historyRef.current = result.stacks;
      historyCoalesceRef.current = false;
      historyCoalesceAtRef.current = 0;
      setSelectedLayer((sel) => resolveSelectedLayer(result.state, sel));
      setSelectedEffectId((id) => clearSelectedEffectIfMissing(result.state, id));
      syncHistoryAvailability();
      setSaveStatus("idle");
      setSaveError(null);
      return result.state;
    });
  }, [syncHistoryAvailability]);

  const handleRedo = useCallback(() => {
    setState((present) => {
      const result = redoHistory(historyRef.current, present);
      if (!result) return present;
      historyRef.current = result.stacks;
      historyCoalesceRef.current = false;
      historyCoalesceAtRef.current = 0;
      setSelectedLayer((sel) => resolveSelectedLayer(result.state, sel));
      setSelectedEffectId((id) => clearSelectedEffectIfMissing(result.state, id));
      syncHistoryAvailability();
      setSaveStatus("idle");
      setSaveError(null);
      return result.state;
    });
  }, [syncHistoryAvailability]);

  const scrollToTimeline = useCallback(() => {
    document.getElementById("global-banner-timeline")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, []);

  const scrollToExportPanel = useCallback(() => {
    setShowExport(true);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const panel = document.getElementById("export-panel");
        panel?.scrollIntoView({ behavior: "smooth", block: "start" });
        panel?.focus({ preventScroll: true });
      }, 120);
    });
  }, []);

  const handleDuplicateLayer = useCallback(
    (layerId: string) => {
      const { state: next, layerId: newId } = duplicateBannerLayerInScene(state, layerId);
      if (!newId) return;
      onUpdate(next);
      const dup = getLayerById(next, newId);
      if (dup) setSelectedLayer(selectionForBannerLayer(dup));
      setSelectedEffectId(null);
    },
    [state, onUpdate],
  );

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      const next = removeLayerFromEditor(state, layerId);
      onUpdate(next);
      const still = (next.bannerLayers ?? []).some((l) => l.id === layerId);
      if (!still) {
        setSelectedLayer(emptyEditorSelection());
        setSelectedEffectId(null);
      }
    },
    [state, onUpdate],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableKeyboardTarget(e.target)) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        const layer = resolveBannerLayerForSelection(state, selectedLayer);
        if (layer) {
          e.preventDefault();
          handleDeleteLayer(layer.id);
          return;
        }
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === "c" || e.key === "C") {
        const layer = resolveBannerLayerForSelection(state, selectedLayer);
        if (!layer || layer.persistent) return;
        copiedLayerIdRef.current = layer.id;
        e.preventDefault();
        return;
      }

      if (e.key === "v" || e.key === "V") {
        const sourceId = copiedLayerIdRef.current;
        if (!sourceId) return;
        e.preventDefault();
        handleDuplicateLayer(sourceId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, selectedLayer, handleDeleteLayer, handleDuplicateLayer, handleUndo, handleRedo]);

  const hasUnsavedChanges = !editorStatesEqual(state, savedState);
  const validation = useMemo(() => getValidationSummary(state), [state]);
  const resolvedInspectorLayer = useMemo(
    () =>
      !selectedEffectId && !selectedTransitionSceneId
        ? resolveBannerLayerForSelection(state, selectedLayer)
        : undefined,
    [state, selectedLayer, selectedEffectId, selectedTransitionSceneId],
  );
  const showInspectorHelp =
    !selectedEffectId && !selectedTransitionSceneId && !resolvedInspectorLayer;

  const inspectorSelection: EditorSelection = useMemo(() => {
    if (selectedTransitionSceneId) {
      return { type: "scene", sceneId: selectedTransitionSceneId };
    }
    if (selectedEffectId) {
      return { type: "effect", effectId: selectedEffectId };
    }
    if (resolvedInspectorLayer) {
      return selectionForBannerLayer(resolvedInspectorLayer);
    }
    return selectedLayer;
  }, [
    selectedTransitionSceneId,
    selectedEffectId,
    resolvedInspectorLayer,
    selectedLayer,
  ]);

  function handleSave() {
    if (!getStoredProjectById(projectId)) {
      setSaveError("Projekt byl odstraněn. Vraťte se na přehled.");
      setSaveStatus("idle");
      return;
    }
    const existing = getStoredProjectById(projectId);
    const project = editorStateToProject(state, existing);
    upsertProject(project);
    const nextState = normalizeEditorState(projectToEditorState(project));
    setState(nextState);
    setSavedState(nextState);
    setSaveStatus("saved");
    setSaveError(null);
  }

  function handlePausePlayback() {
    const frozenGlobalMs = playback.getLiveTimeMs();
    flushSync(() => {
      setScrubTimeMs(frozenGlobalMs);
    });
    playback.pause(frozenGlobalMs);
  }

  function handlePlayAll() {
    playback.play(scrubTimeMs);
  }

  function handleReplayScene() {
    const sceneId = activeScene?.id ?? state.scenes?.[0]?.id;
    if (!sceneId) return;
    const startGlobal = sceneStartGlobalMs(state, sceneId);
    setScrubTimeMs(startGlobal);
    playback.play(startGlobal);
  }

  function handleStopPlayback() {
    playback.stop();
    setScrubTimeMs(0);
  }

  function handleResumePlayback() {
    playback.resume(scrubTimeMs);
  }

  function handleSceneSelect(sceneId: string) {
    playback.stop();
    const startGlobal = sceneStartGlobalMs(state, sceneId);
    setScrubTimeMs(startGlobal);
    onUpdate(setActiveScene(state, sceneId), { history: "skip" });
    setSelectedEffectId(null);
    setSelectedTransitionSceneId(null);
  }

  function handleAssetPlaced(selection: SelectedLayer, message: string) {
    setSelectedLayer(selection);
    setSelectedEffectId(null);
    setPlacementMessage(message);
    window.setTimeout(() => setPlacementMessage(null), 3500);
  }

  function handleQuickAdd(kind: QuickAddLayerType) {
    const selectedId =
      selectedLayer.type === "asset" ? selectedLayer.id : undefined;
    const { state: next, layer, reused } = createQuickLayer(state, kind, {
      selectedLayerId: selectedId,
      startMs: previewSceneLocalMs,
    });
    if (!reused) {
      onUpdate(next);
    }
    setSelectedLayer(selectionForBannerLayer(layer));
    setSelectedEffectId(null);
    if (reused) {
      setPlacementMessage("Logo již existuje — vybráno stávající místo");
      window.setTimeout(() => setPlacementMessage(null), 3500);
    }
  }

  function handleSlotActivate(layerId: string) {
    const layer = getLayerById(state, layerId);
    if (!layer) return;
    setSelectedLayer(selectionForBannerLayer(layer));
    setSelectedEffectId(null);
    setLeftTab("assets");
    window.setTimeout(() => {
      const uploadId =
        layer.slotKind === "logo"
          ? "upload-logo"
          : layer.slotKind === "product" || layer.slotKind === "image"
            ? "upload-product"
            : layer.slotKind === "background"
              ? "upload-background"
              : "upload-decoration";
      document.getElementById(uploadId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  }

  function handlePreviewTransition() {
    const sceneId = selectedTransitionSceneId ?? state.activeSceneId ?? state.scenes?.[0]?.id;
    const scene = sceneId ? getSceneById(state, sceneId) : getActiveScene(state);
    if (!scene) {
      setPlacementMessage("Nejdříve vyberte scénu s přechodem.");
      window.setTimeout(() => setPlacementMessage(null), 3500);
      return;
    }
    if (scene.transitionOut === "none") {
      setPlacementMessage("Scéna nemá přechod — vyberte typ přechodu v panelu Vlastnosti.");
      window.setTimeout(() => setPlacementMessage(null), 4000);
      return;
    }
    if ((state.scenes ?? []).length <= 1) {
      setPlacementMessage("Přechod vyžaduje alespoň dvě scény v projektu.");
      window.setTimeout(() => setPlacementMessage(null), 4000);
      return;
    }
    const transMs = getSceneTransitionDurationMs(scene);
    const startGlobal = sceneStartGlobalMs(state, scene.id) + scene.durationMs - transMs - 200;
    setScrubTimeMs(Math.max(sceneStartGlobalMs(state, scene.id), startGlobal));
    playback.previewSceneTransition(startGlobal, scene.id);
  }

  function handleChecklistAction(action: ChecklistAction) {
    switch (action) {
      case "templates":
        setLeftTab("templates");
        break;
      case "media":
        setLeftTab("assets");
        break;
      case "timeline":
        setLeftTab("assets");
        scrollToTimeline();
        break;
      case "layers": {
        scrollToTimeline();
        const sceneId = state.activeSceneId ?? state.scenes?.[0]?.id;
        const sceneLayers = (state.bannerLayers ?? []).filter(
          (l) => l.sceneId === sceneId && !l.persistent,
        );
        const textLayer = sceneLayers.find(
          (l) => l.type === "text" && l.legacyKey === "headline",
        );
        const target = textLayer ?? sceneLayers[0];
        if (target) {
          setSelectedLayer(selectionForBannerLayer(target));
          setSelectedEffectId(null);
        } else {
          setPlacementMessage("Ve scéně zatím nejsou vrstvy — přidejte text nebo média.");
          window.setTimeout(() => setPlacementMessage(null), 3500);
        }
        break;
      }
      case "transitions": {
        const sceneId = findFirstTransitionSceneNeedingAttention(state);
        if (sceneId) {
          setSelectedTransitionSceneId(sceneId);
          onUpdate(setActiveScene(state, sceneId), { history: "skip" });
        }
        setSelectedEffectId(null);
        break;
      }
      case "timing":
        scrollToTimeline();
        break;
      case "export":
        scrollToExportPanel();
        break;
    }
  }

  function handleWorkflowGuidanceAction() {
    if (!activeGuidance?.action) return;
    switch (activeGuidance.action) {
      case "templates":
        setLeftTab("templates");
        break;
      case "media":
        setLeftTab("assets");
        break;
      case "timeline":
        setLeftTab("assets");
        scrollToTimeline();
        break;
      case "play":
        handlePlayAll();
        break;
      case "layers":
        handleChecklistAction("layers");
        break;
      case "timing":
        handleChecklistAction("timing");
        break;
      case "export":
        scrollToExportPanel();
        break;
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-950">
      <EditorTopBar
        state={state}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        saveError={saveError}
        onSave={handleSave}
        onExport={scrollToExportPanel}
        exportReady={validation.exportReady}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <div className="flex flex-1 flex-col gap-3 p-3 lg:flex-row lg:items-start lg:p-4">
        {/* Left — media / templates only */}
        <aside className="order-2 flex w-full shrink-0 flex-col gap-2 lg:order-1 lg:w-[260px] xl:w-[280px]">
          <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            Knihovna
          </p>
          <div className="flex gap-1 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-1">
            {(["assets", "templates"] as LeftTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLeftTab(tab)}
                className={`flex-1 rounded px-2 py-1.5 text-xs ${
                  leftTab === tab
                    ? "bg-violet-950/50 text-violet-200"
                    : "text-zinc-400 hover:bg-zinc-800/50"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
          {placementMessage ? (
            <p
              role="status"
              className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-[11px] font-medium text-emerald-300"
            >
              ✓ {placementMessage}
            </p>
          ) : null}
          {leftTab === "assets" && (
            <>
              <AssetUploadPanel
                state={state}
                onUpdate={onUpdate}
                onPlaced={handleAssetPlaced}
                selectedLayer={selectedLayer}
                scrubTimeMs={previewSceneLocalMs}
              />
              <AssetLibrary
                state={state}
                onUpdate={onUpdate}
                selectedLayer={selectedLayer}
                onPlaced={handleAssetPlaced}
                scrubTimeMs={previewSceneLocalMs}
              />
            </>
          )}
          {leftTab === "templates" && (
            <TemplatePresetsPanel
              state={state}
              onUpdate={onUpdate}
              hasUnsavedChanges={hasUnsavedChanges}
              onAfterApply={(next, selection, meta) => {
                setSelectedLayer(selection);
                setSelectedEffectId(null);
                setSelectedTransitionSceneId(null);
                setScrubTimeMs(0);
                handleStopPlayback();
                if (meta?.switchToAssets) setLeftTab("assets");
                if (meta?.message) {
                  setPlacementMessage(meta.message);
                  window.setTimeout(() => setPlacementMessage(null), 4500);
                }
              }}
            />
          )}
        </aside>

        {/* Center — canvas + timeline */}
        <div className="order-1 flex min-w-0 flex-1 flex-col gap-3 lg:order-2">
          <BannerPreviewStage
            state={state}
            onUpdate={onUpdate}
            selectedLayer={selectedLayer}
            onSelectLayer={(sel) => {
              setSelectedLayer(sel);
              setSelectedEffectId(null);
            }}
            playback={playback}
            onPlayAll={handlePlayAll}
            onReplayScene={handleReplayScene}
            onPause={handlePausePlayback}
            onResume={handleResumePlayback}
            onStop={handleStopPlayback}
            onQuickAdd={handleQuickAdd}
            onSlotActivate={handleSlotActivate}
            previewSceneId={previewSceneId}
            previewTimeMs={previewSceneLocalMs}
            globalPreviewTimeMs={globalPlayheadMs}
            gateLayersByPreviewTime={gatePreviewByTime}
          />
          <GlobalBannerTimeline
            state={state}
            selectedLayer={selectedLayer}
            onSelectLayer={(sel) => {
              setSelectedLayer(sel);
              setSelectedEffectId(null);
              const layer = resolveBannerLayerForSelection(state, sel);
              if (layer?.sceneId && layer.sceneId !== state.activeSceneId) {
                onUpdate(setActiveScene(state, layer.sceneId), { history: "skip" });
              }
            }}
            playheadMs={globalPlayheadMs}
            isPlaying={playback.isPlaying}
            onScrub={(ms) => {
              if (!playback.isPlaying) setScrubTimeMs(ms);
            }}
            onRangeChange={(layerId, startMs, durationMs) => {
              const sceneId = resolveLayerSceneId(state, layerId);
              if (!sceneId) return;
              onUpdate(
                (prev) => updateLayerTimelineRange(prev, sceneId, layerId, startMs, durationMs),
                { history: "replace" },
              );
            }}
            onPhaseDurationChange={(layerId, phase, durationMs) => {
              const sceneId = resolveLayerSceneId(state, layerId);
              if (!sceneId) return;
              onUpdate(
                (prev) => updateLayerPhaseDuration(prev, sceneId, layerId, phase, durationMs),
                { history: "replace" },
              );
            }}
            onNudgeLayer={(layerId, deltaMs) => {
              const sceneId = resolveLayerSceneId(state, layerId);
              if (!sceneId) return;
              onUpdate((prev) => nudgeLayerTimelineStart(prev, sceneId, layerId, deltaMs));
            }}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
            onUpdate={onUpdate}
          />
          <SceneStrip
            state={state}
            onUpdate={onUpdate}
            onSceneSelect={handleSceneSelect}
            playbackSceneId={
              playback.mode !== "idle" ? playback.playbackSceneId : null
            }
            onPreviewTransition={handlePreviewTransition}
          />
        </div>

        {/* Right — layer properties; export on demand */}
        <aside className="order-3 flex w-full shrink-0 flex-col gap-3 lg:w-[280px] xl:w-[300px]">
          <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            Vlastnosti
          </p>
          <div className="min-h-[280px] shrink-0">
            {showInspectorHelp ? (
              <InspectorEmptyHelp />
            ) : (
              <InspectorPanel
                state={state}
                onUpdate={onUpdate}
                selection={inspectorSelection}
                onSelectEffect={setSelectedEffectId}
                onOpenAssets={() => setLeftTab("assets")}
                onPreviewTransition={handlePreviewTransition}
                onLayerRemoved={() => {
                  setSelectedLayer(emptyEditorSelection());
                  setSelectedEffectId(null);
                }}
              />
            )}
          </div>
          {showExport ? (
            <div
              id="export-panel"
              tabIndex={-1}
              className="flex flex-col gap-3 outline-none scroll-mt-4"
              aria-label="Export ZIP"
            >
              {activeGuidance ? (
                <WorkflowGuidanceBox
                  guidance={activeGuidance}
                  onDismiss={() => setDismissedGuidanceId(activeGuidance.id)}
                  onAction={activeGuidance.action ? handleWorkflowGuidanceAction : undefined}
                />
              ) : null}
              <BannerChecklist state={state} onAction={handleChecklistAction} />
              <AssetWarningsPanel state={state} />
              <ValidationExportPanel
                state={state}
                validation={validation}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export function BannerEditor({ projectId }: BannerEditorProps) {
  const isClient = useIsClient();
  const project = useProjectLookup(projectId);

  if (!isClient) {
    return (
      <div className="flex min-h-full flex-col">
        <div className="border-b border-zinc-800/80 px-4 py-4">
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-800/60" />
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-zinc-500">Načítání editoru…</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">Projekt nenalezen</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-500">
          Tento banner v lokálním úložišti prohlížeče neexistuje.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Zpět na přehled
        </Link>
      </div>
    );
  }

  return (
    <BannerEditorInner
      key={project.id}
      projectId={project.id}
      initialState={projectToEditorState(project)}
    />
  );
}
