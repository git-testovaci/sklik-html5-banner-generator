"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  editorStateToProject,
  getProjectById,
  projectToEditorState,
} from "@/lib/mock-projects";
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
} from "@/types/editor";
import { BannerPreviewStage } from "./BannerPreviewStage";
import { EditorSettingsPanel } from "./EditorSettingsPanel";
import { EditorTopBar } from "./EditorTopBar";
import { ValidationExportPanel } from "./ValidationExportPanel";

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
  const [state, setState] = useState<BannerEditorState>(initialState);
  const [savedState, setSavedState] = useState<BannerEditorState>(initialState);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  const onUpdate: BannerEditorStateUpdater = (patch) => {
    setState((prev) => ({ ...prev, ...patch }));
    setSaveStatus("idle");
  };

  const hasUnsavedChanges = !editorStatesEqual(state, savedState);

  const validation = useMemo(
    () => getValidationSummary(state),
    [state],
  );

  function handleSave() {
    const existing =
      getStoredProjectById(projectId) ?? getProjectById(projectId);
    const project = editorStateToProject(state, existing);
    upsertProject(project);

    const nextState = projectToEditorState(project);
    setState(nextState);
    setSavedState(nextState);
    setSaveStatus("saved");
  }

  return (
    <div className="flex min-h-full flex-col">
      <EditorTopBar
        state={state}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        onSave={handleSave}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:items-stretch lg:gap-4 lg:p-4">
        <div className="order-2 lg:order-1">
          <EditorSettingsPanel state={state} onUpdate={onUpdate} />
        </div>

        <div className="order-1 flex min-h-[320px] flex-1 flex-col lg:order-2 lg:min-h-0">
          <BannerPreviewStage state={state} />
        </div>

        <div className="order-3">
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
          This banner project does not exist in local storage. It may have been
          deleted or the link is invalid.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
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
