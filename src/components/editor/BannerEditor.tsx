"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  normalizeEditorState,
  projectToEditorState,
  editorStateToProject,
  resolveSelectedLayer,
} from "@/lib/animation/timeline-utils";
import {
  clearSelectedEffectIfMissing,
  getActiveScene,
  setActiveScene,
} from "@/lib/animation/storyboard-utils";
import {
  getProjectByIdSnapshot,
  getStoredProjectById,
  subscribeProjects,
  upsertProject,
} from "@/lib/project-storage";
import { getValidationSummary } from "@/lib/validation-rules";
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
import { BannerPreviewStage } from "./BannerPreviewStage";
import { InspectorPanel } from "./InspectorPanel";
import { KeyframeTimeline } from "./KeyframeTimeline";
import { LayerPanel } from "./LayerPanel";
import { MotionPresetQuickActions } from "./MotionPresetQuickActions";
import { SceneStrip } from "./SceneStrip";
import { TemplatePresetsPanel } from "./TemplatePresetsPanel";
import { ValidationExportPanel } from "./ValidationExportPanel";
import { EditorTopBar } from "./EditorTopBar";

type LeftTab = "assets" | "layers" | "templates";

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
  const [replayKey, setReplayKey] = useState(0);
  const [playAll, setPlayAll] = useState(false);
  const [playbackSceneId, setPlaybackSceneId] = useState<string | null>(null);
  const [playbackTimeMs, setPlaybackTimeMs] = useState(0);
  const [leftTab, setLeftTab] = useState<LeftTab>("layers");
  const [showExport, setShowExport] = useState(false);

  const playbackRafRef = useRef<number | null>(null);

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

  const playAllTimerRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      if (playbackRafRef.current !== null) {
        cancelAnimationFrame(playbackRafRef.current);
      }
      playAllTimerRef.current.forEach((t) => window.clearTimeout(t));
      playAllTimerRef.current = [];
    };
  }, []);

  useEffect(() => {
    const scenes = state.scenes ?? [];
    const loop = state.timeline?.loop ?? false;
    const timelineDurationMs = state.timeline?.durationMs ?? 3000;
    const scene =
      scenes.find((s) => s.id === (state.activeSceneId ?? scenes[0]?.id)) ?? scenes[0];
    const totalDurationMs = scenes.reduce((sum, s) => sum + s.durationMs, 0);
    const duration = playAll ? totalDurationMs : scene?.durationMs ?? timelineDurationMs;

    if (!playAll && replayKey === 0) {
      return;
    }

    if (playbackRafRef.current !== null) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }

    const start = performance.now();
    let cancelled = false;

    function resolveSceneAt(elapsed: number) {
      if (!playAll || scenes.length <= 1) {
        setPlaybackSceneId(scene?.id ?? null);
        return;
      }
      let offset = 0;
      for (const s of scenes) {
        if (elapsed >= offset && elapsed < offset + s.durationMs) {
          setPlaybackSceneId(s.id);
          return;
        }
        offset += s.durationMs;
      }
      setPlaybackSceneId(scenes[scenes.length - 1]?.id ?? null);
    }

    function tick(now: number) {
      if (cancelled) return;
      let elapsed = now - start;

      if (playAll && loop && duration > 0) {
        elapsed = elapsed % duration;
      }

      if (elapsed >= duration) {
        setPlaybackTimeMs(duration);
        if (playAll && loop && duration > 0) {
          playbackRafRef.current = requestAnimationFrame(tick);
          return;
        }
        if (playAll) {
          setPlayAll(false);
          setPlaybackSceneId(null);
        }
        setPlaybackTimeMs(0);
        return;
      }

      setPlaybackTimeMs(elapsed);
      resolveSceneAt(elapsed);
      playbackRafRef.current = requestAnimationFrame(tick);
    }

    playbackRafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (playbackRafRef.current !== null) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
    };
  }, [
    playAll,
    replayKey,
    state.scenes,
    state.timeline?.loop,
    state.timeline?.durationMs,
    state.activeSceneId,
  ]);

  const hasUnsavedChanges = !editorStatesEqual(state, savedState);
  const validation = useMemo(() => getValidationSummary(state), [state]);
  const activeScene = getActiveScene(state);

  const editorSelection: EditorSelection = selectedEffectId
    ? { type: "effect", effectId: selectedEffectId }
    : selectedLayer;

  function handleSave() {
    if (!getStoredProjectById(projectId)) {
      setSaveError("This project was removed. Return to the dashboard.");
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
    setPlayAll(true);
    setPlaybackTimeMs(0);
    setPlaybackSceneId(state.scenes?.[0]?.id ?? null);
    setReplayKey((k) => k + 1);
  }

  function handleReplayScene() {
    setPlayAll(false);
    setPlaybackTimeMs(0);
    setPlaybackSceneId(activeScene?.id ?? null);
    setReplayKey((k) => k + 1);
  }

  function handleSceneSelect(sceneId: string) {
    onUpdate(setActiveScene(state, sceneId));
    setSelectedEffectId(null);
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
                className={`flex-1 rounded px-2 py-1.5 text-xs capitalize ${
                  leftTab === tab
                    ? "bg-violet-950/50 text-violet-200"
                    : "text-zinc-400 hover:bg-zinc-800/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {leftTab === "assets" && (
            <>
              <AssetUploadPanel state={state} onUpdate={onUpdate} />
              <AssetLibrary state={state} onUpdate={onUpdate} />
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
              onAfterApply={(_next, selection) => {
                setSelectedLayer(selection);
                setSelectedEffectId(null);
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
            replayKey={replayKey}
            playAll={playAll}
            playbackSceneId={playbackSceneId}
            playbackTimeMs={playbackTimeMs}
            onReplay={() => {
              setPlayAll(false);
              setPlaybackTimeMs(0);
              setReplayKey((k) => k + 1);
            }}
            onReplayScene={handleReplayScene}
            onPlayAll={handlePlayAll}
          />
          <SceneStrip
            state={state}
            onUpdate={onUpdate}
            onSceneSelect={handleSceneSelect}
            playbackSceneId={playAll ? playbackSceneId : activeScene?.id}
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
          />
        </div>

        {/* Right — inspector + export */}
        <div className="order-3 flex w-full shrink-0 flex-col gap-3 lg:w-[280px] xl:w-[300px]">
          <InspectorPanel
            state={state}
            onUpdate={onUpdate}
            selection={editorSelection}
            onSelectEffect={setSelectedEffectId}
          />
          <button
            type="button"
            onClick={() => setShowExport((v) => !v)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800/50"
          >
            {showExport ? "Hide export panel" : "Show export & validation"}
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
          <p className="text-sm text-zinc-500">Loading editor…</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">Project not found</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-500">
          This banner project does not exist in local storage.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Back to dashboard
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
