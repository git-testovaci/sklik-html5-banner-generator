"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useCallback } from "react";
import {
  normalizeEditorState,
  projectToEditorState,
  editorStateToProject,
  resolveSelectedLayer,
} from "@/lib/animation/timeline-utils";
import {
  clearSelectedEffectIfMissing,
  duplicateBannerLayerInScene,
  getActiveScene,
  getLayerById,
  getSceneById,
  removeLayerFromEditor,
  resolveBannerLayerForSelection,
  sceneLocalPlaybackTime,
  setActiveScene,
} from "@/lib/animation/storyboard-utils";
import { nudgeLayerTimelineStart, updateLayerTimelineRange } from "@/lib/animation/layer-timeline-utils";
import { updateLayerPhaseDuration } from "@/lib/animation/layer-phase-utils";
import { createQuickLayer, type QuickAddLayerType } from "@/lib/animation/layer-factory";
import { selectionForBannerLayer } from "@/lib/animation/layer-timeline-utils";
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
import { KeyframeTimeline } from "./KeyframeTimeline";
import { LayerPanel } from "./LayerPanel";
import { UnifiedLayerTimeline } from "./UnifiedLayerTimeline";
import { MotionPresetQuickActions } from "./MotionPresetQuickActions";
import { SceneStrip } from "./SceneStrip";
import { TemplatePresetsPanel } from "./TemplatePresetsPanel";
import { ValidationExportPanel } from "./ValidationExportPanel";
import { WorkflowGuidanceBox } from "./WorkflowGuidance";
import { EditorTopBar } from "./EditorTopBar";
import { getValidationSummary } from "@/lib/validation-rules";

type LeftTab = "assets" | "layers" | "templates";

const TAB_LABELS: Record<LeftTab, string> = {
  assets: "Média",
  layers: "Vrstvy",
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
  const [selectedLayer, setSelectedLayer] = useState<SelectedLayer>({
    type: "asset",
    id: "__none__",
  });
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>(() =>
    (initialState.scenes ?? []).length >= 2 ? "layers" : "templates",
  );
  const [showExport, setShowExport] = useState(false);
  const [placementMessage, setPlacementMessage] = useState<string | null>(null);
  const [selectedTransitionSceneId, setSelectedTransitionSceneId] = useState<string | null>(null);
  const [expandTiming, setExpandTiming] = useState(false);
  const [showEffectDetail, setShowEffectDetail] = useState(false);
  const [scrubTimeMs, setScrubTimeMs] = useState(0);
  const [dismissedGuidanceId, setDismissedGuidanceId] = useState<string | null>(null);
  const copiedLayerIdRef = useRef<string | null>(null);

  const workflowGuidance = useMemo(() => deriveWorkflowGuidance(state), [state]);
  const activeGuidance =
    workflowGuidance && workflowGuidance.id !== dismissedGuidanceId
      ? workflowGuidance
      : null;

  const playback = usePlaybackController({
    scenes: state.scenes,
    loop: state.timeline?.loop ?? false,
    timelineDurationMs: state.timeline?.durationMs ?? 3000,
    activeSceneId: state.activeSceneId,
  });

  const activeScene = getActiveScene(state);

  const localPreviewTimeMs = useMemo(() => {
    const sceneId = activeScene?.id;
    if (!sceneId) return scrubTimeMs;
    if (
      playback.isPlaying &&
      playback.playbackSceneId === sceneId
    ) {
      return sceneLocalPlaybackTime(
        playback.playbackTimeMs,
        state.scenes ?? [],
        sceneId,
        playback.playAllView,
      );
    }
    return scrubTimeMs;
  }, [
    activeScene?.id,
    playback.isPlaying,
    playback.playbackTimeMs,
    playback.playbackSceneId,
    playback.playAllView,
    scrubTimeMs,
    state.scenes,
  ]);

  const gatePreviewByTime = !playback.isPlaying;

  const onUpdate = useCallback<BannerEditorStateUpdater>((patch) => {
    setState((prev) => {
      const next = normalizeEditorState({ ...prev, ...patch });
      setSelectedLayer((sel) => resolveSelectedLayer(next, sel));
      setSelectedEffectId((id) => clearSelectedEffectIfMissing(next, id));
      return next;
    });
    setSaveStatus("idle");
    setSaveError(null);
  }, []);

  const scrollToTimeline = useCallback(() => {
    document.getElementById("unified-layer-timeline")?.scrollIntoView({
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
      if (
        dup?.type === "text" &&
        dup.legacyKey &&
        (dup.legacyKey === "headline" ||
          dup.legacyKey === "subheadline" ||
          dup.legacyKey === "cta")
      ) {
        setSelectedLayer({ type: "text", id: dup.legacyKey });
      } else {
        setSelectedLayer({ type: "asset", id: newId });
      }
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
        setSelectedLayer({ type: "asset", id: "__none__" });
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
  }, [state, selectedLayer, handleDeleteLayer, handleDuplicateLayer]);

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

  const editorSelection: EditorSelection = selectedEffectId
    ? { type: "effect", effectId: selectedEffectId }
    : selectedLayer;

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

  function handlePlayAll() {
    playback.playAll();
  }

  function handleReplayScene() {
    playback.replayScene();
  }

  function handleSceneSelect(sceneId: string) {
    playback.stop();
    setScrubTimeMs(0);
    onUpdate(setActiveScene(state, sceneId));
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
      startMs: localPreviewTimeMs,
    });
    if (!reused) {
      onUpdate(next);
    }
    if (
      layer.type === "text" &&
      layer.legacyKey &&
      (layer.legacyKey === "headline" ||
        layer.legacyKey === "subheadline" ||
        layer.legacyKey === "cta")
    ) {
      setSelectedLayer({ type: "text", id: layer.legacyKey });
    } else {
      setSelectedLayer({ type: "asset", id: layer.id });
    }
    setSelectedEffectId(null);
    if (reused) {
      setPlacementMessage("Logo slot již existuje — vybrán stávající slot");
      window.setTimeout(() => setPlacementMessage(null), 3500);
    }
  }

  function handleSlotActivate(layerId: string) {
    const layer = getLayerById(state, layerId);
    if (!layer) return;
    setSelectedLayer({ type: "asset", id: layer.id });
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
      setPlacementMessage("Přechod vyžaduje alespoň dvě scény ve storyboardu.");
      window.setTimeout(() => setPlacementMessage(null), 4000);
      return;
    }
    playback.previewSceneTransition();
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
        setLeftTab("layers");
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
          onUpdate(setActiveScene(state, sceneId));
        }
        setSelectedEffectId(null);
        break;
      }
      case "timing":
        setExpandTiming(true);
        setShowEffectDetail(true);
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
      />

      <div className="flex flex-1 flex-col gap-3 p-3 lg:flex-row lg:items-stretch lg:p-4">
        {/* Left — media / layers / templates library */}
        <aside className="order-2 flex w-full shrink-0 flex-col gap-2 lg:order-1 lg:w-[260px] xl:w-[280px]">
          <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            Knihovna
          </p>
          <div className="flex gap-1 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-1">
            {(["assets", "layers", "templates"] as LeftTab[]).map((tab) => (
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
            <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-[11px] text-emerald-300">
              {placementMessage}
            </p>
          ) : null}
          {leftTab === "assets" && (
            <>
              <AssetUploadPanel
                state={state}
                onUpdate={onUpdate}
                onPlaced={handleAssetPlaced}
                selectedLayer={selectedLayer}
                scrubTimeMs={localPreviewTimeMs}
              />
              <AssetLibrary
                state={state}
                onUpdate={onUpdate}
                selectedLayer={selectedLayer}
                onPlaced={handleAssetPlaced}
                scrubTimeMs={localPreviewTimeMs}
              />
            </>
          )}
          {leftTab === "layers" && (
            <LayerPanel
              state={state}
              selectedLayer={selectedLayer}
              onSelectLayer={(sel) => {
                setSelectedLayer(sel);
                setSelectedEffectId(null);
              }}
              onUpdate={onUpdate}
              onDuplicateLayer={handleDuplicateLayer}
              onDeleteLayer={handleDeleteLayer}
            />
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
                playback.stop();
                if (meta?.switchToAssets) setLeftTab("assets");
                if (meta?.message) {
                  setPlacementMessage(meta.message);
                  window.setTimeout(() => setPlacementMessage(null), 4500);
                }
              }}
            />
          )}
        </aside>

        {/* Center — dominant canvas + timeline */}
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
            onQuickAdd={handleQuickAdd}
            onSlotActivate={handleSlotActivate}
            previewTimeMs={localPreviewTimeMs}
            gateLayersByPreviewTime={gatePreviewByTime}
          />
          <SceneStrip
            state={state}
            onUpdate={onUpdate}
            onSceneSelect={handleSceneSelect}
            playbackSceneId={
              playback.mode !== "idle" ? playback.playbackSceneId : null
            }
            selectedTransitionSceneId={selectedTransitionSceneId}
            onSelectTransition={(sceneId) => {
              setSelectedTransitionSceneId(sceneId);
              setSelectedEffectId(null);
            }}
            onPreviewTransition={handlePreviewTransition}
          />
          <MotionPresetQuickActions
            state={state}
            onUpdate={onUpdate}
            selectedLayer={selectedLayer}
            onSelectEffect={setSelectedEffectId}
          />
          <UnifiedLayerTimeline
            state={state}
            selectedLayer={selectedLayer}
            onSelectLayer={(sel) => {
              setSelectedLayer(sel);
              setSelectedEffectId(null);
            }}
            playheadMs={localPreviewTimeMs}
            isPlaying={playback.isPlaying}
            onScrub={(ms) => {
              if (!playback.isPlaying) setScrubTimeMs(ms);
            }}
            onRangeChange={(layerId, startMs, durationMs) => {
              const sceneId = activeScene?.id;
              if (!sceneId) return;
              onUpdate(updateLayerTimelineRange(state, sceneId, layerId, startMs, durationMs));
            }}
            onPhaseDurationChange={(layerId, phase, durationMs) => {
              const sceneId = activeScene?.id;
              if (!sceneId) return;
              onUpdate(updateLayerPhaseDuration(state, sceneId, layerId, phase, durationMs));
            }}
            onNudgeLayer={(layerId, deltaMs) => {
              const sceneId = activeScene?.id;
              if (!sceneId) return;
              onUpdate(nudgeLayerTimelineStart(state, sceneId, layerId, deltaMs));
            }}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
          />
          {showEffectDetail ? (
            <>
              <KeyframeTimeline
                state={state}
                onUpdate={onUpdate}
                selectedEffectId={selectedEffectId}
                onSelectEffect={setSelectedEffectId}
                forceExpandAdvanced={expandTiming}
                onExpanded={() => setExpandTiming(false)}
                onSelectTransition={(sceneId) => {
                  setSelectedTransitionSceneId(sceneId);
                  setSelectedEffectId(null);
                }}
                playbackMode={playback.mode}
                playbackTimeMs={playback.playbackTimeMs}
                playbackSceneId={playback.playbackSceneId}
                playAllView={playback.playAllView}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowEffectDetail(false)}
                  className="text-[10px] text-zinc-500 hover:text-violet-400 hover:underline"
                >
                  Skrýt detail animací
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowEffectDetail(true)}
                className="text-[10px] text-zinc-500 hover:text-violet-400 hover:underline"
              >
                Detail animací / pokročilé časování
              </button>
            </div>
          )}
        </div>

        {/* Right — checklist, inspector, export */}
        <aside className="order-3 flex w-full shrink-0 flex-col gap-3 lg:w-[280px] xl:w-[300px]">
          <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            Nastavení a export
          </p>
          {activeGuidance ? (
            <WorkflowGuidanceBox
              guidance={activeGuidance}
              onDismiss={() => setDismissedGuidanceId(activeGuidance.id)}
              onAction={activeGuidance.action ? handleWorkflowGuidanceAction : undefined}
            />
          ) : null}
          <BannerChecklist state={state} onAction={handleChecklistAction} />
          {showInspectorHelp ? (
            <InspectorEmptyHelp />
          ) : (
            <InspectorPanel
              state={state}
              onUpdate={onUpdate}
              selection={
                selectedTransitionSceneId
                  ? { type: "scene", sceneId: selectedTransitionSceneId }
                  : editorSelection
              }
              onSelectEffect={setSelectedEffectId}
              onOpenAssets={() => setLeftTab("assets")}
              onPreviewTransition={handlePreviewTransition}
              onLayerRemoved={() => {
                setSelectedLayer({ type: "asset", id: "__none__" });
                setSelectedEffectId(null);
              }}
            />
          )}
          <div
            id="export-panel"
            tabIndex={-1}
            className="outline-none scroll-mt-4"
            aria-label="Export Sklik HTML5"
          >
            <button
              type="button"
              onClick={() => setShowExport((v) => !v)}
              className={`w-full rounded-lg border px-3 py-2.5 text-xs font-medium ${
                showExport
                  ? "border-violet-700/50 bg-violet-950/30 text-violet-200"
                  : validation.exportReady
                    ? "border-emerald-800/50 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40"
                    : "border-zinc-700 text-zinc-400 hover:bg-zinc-800/50"
              }`}
            >
              {showExport ? "Skrýt export" : "Export Sklik HTML5 ZIP"}
            </button>
            {showExport && (
              <>
                <AssetWarningsPanel state={state} />
                <ValidationExportPanel
                  state={state}
                  validation={validation}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
              </>
            )}
          </div>
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
