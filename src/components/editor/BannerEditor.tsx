"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { normalizeEditorState, projectToEditorState, editorStateToProject, resolveSelectedLayer } from "@/lib/animation/timeline-utils";
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
  type SelectedLayer,
} from "@/types/editor";
import { AssetLibrary } from "./AssetLibrary";
import { AssetUploadPanel } from "./AssetUploadPanel";
import { AssetWarningsPanel } from "./AssetWarningsPanel";
import { BannerPreviewStage } from "./BannerPreviewStage";
import { EditorSettingsPanel } from "./EditorSettingsPanel";
import { EditorTopBar } from "./EditorTopBar";
import { LayerPanel } from "./LayerPanel";
import { TemplatePresetsPanel } from "./TemplatePresetsPanel";
import { TimelinePanel } from "./TimelinePanel";
import { ValidationExportPanel } from "./ValidationExportPanel";

function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-1 pb-1">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      {hint ? <p className="mt-0.5 text-[11px] leading-snug text-zinc-600">{hint}</p> : null}
    </div>
  );
}

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

type SelectedLayerState = SelectedLayer;

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
  const [selectedLayer, setSelectedLayer] = useState<SelectedLayerState>({
    type: "text",
    id: "headline",
  });
  const [replayKey, setReplayKey] = useState(0);

  const onUpdate: BannerEditorStateUpdater = (patch) => {
    setState((prev) => {
      const next = normalizeEditorState({ ...prev, ...patch });
      setSelectedLayer((sel) => resolveSelectedLayer(next, sel));
      return next;
    });
    setSaveStatus("idle");
    setSaveError(null);
  };

  const hasUnsavedChanges = !editorStatesEqual(state, savedState);
  const validation = useMemo(() => getValidationSummary(state), [state]);

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

  return (
    <div className="flex min-h-full flex-col">
      <EditorTopBar
        state={state}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        saveError={saveError}
        onSave={handleSave}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:items-start">
        <div className="order-2 flex w-full shrink-0 flex-col gap-3 lg:order-1 lg:w-[300px] xl:w-[320px]">
          <SectionLabel title="Content" hint="Text, colors, and banner size." />
          <EditorSettingsPanel state={state} onUpdate={onUpdate} />
          <TemplatePresetsPanel
            state={state}
            onUpdate={onUpdate}
            hasUnsavedChanges={hasUnsavedChanges}
          />

          <SectionLabel title="Assets" hint="Upload logo, product, or background images." />
          <AssetUploadPanel state={state} onUpdate={onUpdate} />
          <AssetLibrary state={state} onUpdate={onUpdate} />

          <SectionLabel title="Layers" hint="Select a layer and adjust position." />
          <LayerPanel
            state={state}
            selectedLayer={selectedLayer}
            onSelectLayer={setSelectedLayer}
            onUpdate={onUpdate}
          />
        </div>

        <div className="order-1 flex min-w-0 flex-1 flex-col gap-3 lg:order-2">
          <SectionLabel title="Preview" hint="Click and drag layers on the canvas." />
          <BannerPreviewStage
            state={state}
            onUpdate={onUpdate}
            selectedLayer={selectedLayer}
            onSelectLayer={setSelectedLayer}
            replayKey={replayKey}
            onReplay={() => setReplayKey((k) => k + 1)}
          />

          <SectionLabel title="Timeline" hint="Drag purple bars to adjust timing." />
          <TimelinePanel
            state={state}
            onUpdate={onUpdate}
            selectedLayer={selectedLayer}
            onReplay={() => setReplayKey((k) => k + 1)}
          />
        </div>

        <div className="order-3 flex w-full shrink-0 flex-col gap-3 lg:w-[300px] xl:w-[320px]">
          <SectionLabel
            title="Validation & export"
            hint="Export ZIP when validation passes."
          />
          <AssetWarningsPanel state={state} />
          <ValidationExportPanel
            state={state}
            validation={validation}
            hasUnsavedChanges={hasUnsavedChanges}
          />
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
