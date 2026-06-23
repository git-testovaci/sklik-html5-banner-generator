"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  normalizeEditorState,
  projectToEditorState,
  editorStateToProject,
  resolveSelectedLayer,
} from "@/lib/animation/timeline-utils";
import {
  clearSelectedEffectIfMissing,
  getLayerById,
  setActiveScene,
} from "@/lib/animation/storyboard-utils";
import { createQuickLayer, type QuickAddLayerType } from "@/lib/animation/layer-factory";
import { findEmptySlotForKind, getTemplateSlotLayers } from "@/lib/assets/slot-utils";
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
import { KeyframeTimeline } from "./KeyframeTimeline";
import { LayerPanel } from "./LayerPanel";
import { MotionPresetQuickActions } from "./MotionPresetQuickActions";
import { SceneStrip } from "./SceneStrip";
import { TemplatePresetsPanel } from "./TemplatePresetsPanel";
import { ValidationExportPanel } from "./ValidationExportPanel";
import { WorkflowGuidanceBox } from "./WorkflowGuidance";
import { EditorTopBar } from "./EditorTopBar";
import { getValidationSummary } from "@/lib/validation-rules";

type LeftTab = "assets" | "layers" | "templates";

const TAB_LABELS: Record<LeftTab, string> = {
  assets: "Assety",
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
    type: "text",
    id: "headline",
  });
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("layers");
  const [showExport, setShowExport] = useState(false);
  const [placementMessage, setPlacementMessage] = useState<string | null>(null);
  const [selectedTransitionSceneId, setSelectedTransitionSceneId] = useState<string | null>(null);
  const [expandTiming, setExpandTiming] = useState(false);
  const [dismissedGuidanceId, setDismissedGuidanceId] = useState<string | null>(null);

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

  const onUpdate: BannerEditorStateUpdater = (patch) => {
    setState((prev) => {
      const next = normalizeEditorState({ ...prev, ...patch });
      setSelectedLayer((sel) => resolveSelectedLayer(next, sel));
      setSelectedEffectId((id) => clearSelectedEffectIfMissing(next, id));
      return next;
    });
    setSaveStatus("idle");
    setSaveError(null);
  };

  const hasUnsavedChanges = !editorStatesEqual(state, savedState);
  const validation = useMemo(() => getValidationSummary(state), [state]);

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
    });
    if (!reused) {
      onUpdate(next);
    }
    if (
      layer.type === "text" &&
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
  }

  function handleChecklistAction(action: ChecklistAction) {
    switch (action) {
      case "templates":
        setLeftTab("templates");
        break;
      case "logo-slot": {
        setLeftTab("assets");
        const logoSlot = findEmptySlotForKind(state, "logo") ?? getTemplateSlotLayers(state).find((s) => s.slotKind === "logo");
        if (logoSlot) setSelectedLayer({ type: "asset", id: logoSlot.id });
        break;
      }
      case "product-slot": {
        setLeftTab("assets");
        const productSlot =
          findEmptySlotForKind(state, "product") ??
          getTemplateSlotLayers(state).find((s) => s.slotKind === "product" || s.slotKind === "image");
        if (productSlot) setSelectedLayer({ type: "asset", id: productSlot.id });
        break;
      }
      case "text": {
        const sceneId = state.activeSceneId ?? state.scenes?.[0]?.id;
        const textLayer = (state.bannerLayers ?? []).find(
          (l) => l.sceneId === sceneId && l.type === "text" && l.legacyKey === "headline",
        );
        const key = textLayer?.legacyKey;
        if (key === "headline" || key === "subheadline" || key === "cta") {
          setSelectedLayer({ type: "text", id: key });
        } else {
          setSelectedLayer({ type: "text", id: "headline" });
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
        document.getElementById("keyframe-timeline")?.scrollIntoView({ behavior: "smooth" });
        break;
      case "export":
        setShowExport(true);
        break;
    }
  }

  function handleWorkflowGuidanceAction() {
    if (!activeGuidance?.action) return;
    switch (activeGuidance.action) {
      case "templates":
        setLeftTab("templates");
        break;
      case "assets":
        setLeftTab("assets");
        break;
      case "play":
        handlePlayAll();
        break;
      case "text":
        handleChecklistAction("text");
        break;
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <EditorTopBar
        state={state}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        saveError={saveError}
        onSave={handleSave}
      />

      <div className="flex flex-1 flex-col gap-3 p-4 lg:flex-row lg:items-start">
        {/* Left sidebar — compact tabs */}
        <div className="order-2 flex w-full shrink-0 flex-col gap-2 lg:order-1 lg:w-[260px] xl:w-[280px]">
          <div className="flex gap-1 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-1">
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
              <AssetUploadPanel state={state} onUpdate={onUpdate} onPlaced={handleAssetPlaced} />
              <AssetLibrary
                state={state}
                onUpdate={onUpdate}
                selectedLayer={selectedLayer}
                onPlaced={handleAssetPlaced}
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
                playback.stop();
                if (meta?.switchToAssets) setLeftTab("assets");
                if (meta?.message) {
                  setPlacementMessage(meta.message);
                  window.setTimeout(() => setPlacementMessage(null), 4500);
                }
              }}
            />
          )}
        </div>

        {/* Center — canvas + storyboard + timeline */}
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
            onPreviewTransition={() => playback.previewSceneTransition()}
          />
          <MotionPresetQuickActions
            state={state}
            onUpdate={onUpdate}
            selectedLayer={selectedLayer}
            onSelectEffect={setSelectedEffectId}
          />
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
          />
        </div>

        {/* Right — checklist + inspector + export */}
        <div className="order-3 flex w-full shrink-0 flex-col gap-3 lg:w-[280px] xl:w-[300px]">
          {activeGuidance ? (
            <WorkflowGuidanceBox
              guidance={activeGuidance}
              onDismiss={() => setDismissedGuidanceId(activeGuidance.id)}
              onAction={activeGuidance.action ? handleWorkflowGuidanceAction : undefined}
            />
          ) : null}
          <BannerChecklist state={state} onAction={handleChecklistAction} />
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
            onPreviewTransition={() => playback.previewSceneTransition()}
          />
          <button
            type="button"
            onClick={() => setShowExport((v) => !v)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800/50"
          >
            {showExport ? "Skrýt export" : "Export Sklik ZIP"}
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
