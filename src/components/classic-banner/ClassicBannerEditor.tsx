"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createDefaultClassicBannerData } from "@/lib/classic-banner/classic-banner-defaults";
import {
  classicBannerPngFilename,
  classicBannerZipFilename,
  exportClassicBannerAllVariantsToZip,
  exportClassicBannerVariantToPng,
} from "@/lib/classic-banner/classic-banner-export";
import { CLASSIC_BANNER_MASTER_SIZE_ID } from "@/lib/classic-banner/classic-banner-sizes";
import {
  classicBannerEditorSnapshotsEqual,
  classicBannerEditorStateEqual,
  cloneClassicBannerEditorSnapshot,
  mergeClassicBannerIntoProject,
  prepareClassicBannerData,
  type ClassicBannerEditorSnapshot,
} from "@/lib/classic-banner/classic-banner-update";
import { getClassicBannerRecommendations } from "@/lib/classic-banner/classic-banner-recommendations";
import { patchClassicBannerLayerOverride, resolveClassicBannerFinalLayout } from "@/lib/classic-banner/classic-banner-overrides";
import {
  applyHistoryUpdate,
  createEmptyHistoryStacks,
  isEditableKeyboardTarget,
  redoHistoryStack,
  undoHistoryStack,
  type HistoryStacks,
} from "@/lib/editor/editor-history";
import { downloadBlob } from "@/lib/export/download-blob";
import { getStoredProjectById, upsertProject } from "@/lib/project-storage";
import type {
  ClassicBannerEditorChangeOptions,
  ClassicBannerProjectData,
  ClassicEditableSlotId,
} from "@/types/classic-banner";
import type { BannerAsset } from "@/types/assets";
import type { BannerProject } from "@/types/project";
import { ProjectStatusBadge } from "@/components/dashboard/ProjectStatusBadge";
import { EditorUndoRedoButtons } from "@/components/editor/EditorTopBar";
import { ClassicBannerInspector } from "./ClassicBannerInspector";
import { ClassicBannerPreview } from "./ClassicBannerPreview";
import { ClassicBannerWarnings } from "./ClassicBannerWarnings";
import { ClassicLayerList } from "./ClassicLayerList";
import { ClassicVariantSwitcher } from "./ClassicVariantSwitcher";

const AUTOSAVE_DEBOUNCE_MS = 750;

interface ClassicBannerEditorProps {
  project: BannerProject;
}

function persistClassicBannerProject(
  project: BannerProject,
  classicBanner: ClassicBannerProjectData,
  assets: BannerAsset[],
): BannerProject | null {
  const existing = getStoredProjectById(project.id);
  if (!existing) return null;
  const next = mergeClassicBannerIntoProject(existing, classicBanner, assets);
  upsertProject(next);
  return next;
}

export function ClassicBannerEditor({ project }: ClassicBannerEditorProps) {
  const rawInitial =
    project.classicBanner ?? createDefaultClassicBannerData(CLASSIC_BANNER_MASTER_SIZE_ID);
  const initialData = prepareClassicBannerData(rawInitial);

  const [classicBanner, setClassicBanner] = useState<ClassicBannerProjectData>(initialData);
  const [savedData, setSavedData] = useState<ClassicBannerProjectData>(initialData);
  const [assets, setAssets] = useState<BannerAsset[]>(project.assets ?? []);
  const [savedAssets, setSavedAssets] = useState<BannerAsset[]>(project.assets ?? []);
  const [selectedSizeId, setSelectedSizeId] = useState(
    initialData.masterSizeId || CLASSIC_BANNER_MASTER_SIZE_ID,
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<"idle" | "png" | "zip">("idle");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportIsError, setExportIsError] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<ClassicEditableSlotId | null>(null);
  const [viewZoom, setViewZoom] = useState(1);
  const isExporting = exportMode !== "idle";

  const classicBannerRef = useRef(classicBanner);
  const savedDataRef = useRef(savedData);
  const assetsRef = useRef(assets);
  const savedAssetsRef = useRef(savedAssets);
  const selectedSizeIdRef = useRef(selectedSizeId);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosavePendingRef = useRef(false);
  const historyRef = useRef<HistoryStacks<ClassicBannerEditorSnapshot>>(createEmptyHistoryStacks());
  const historyCoalesceRef = useRef(false);
  const historyCoalesceAtRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryAvailability = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  const getSnapshot = useCallback((): ClassicBannerEditorSnapshot => {
    return {
      classicBanner: classicBannerRef.current,
      assets: assetsRef.current,
    };
  }, []);

  const repairSelectionAfterSnapshot = useCallback((snapshot: ClassicBannerEditorSnapshot) => {
    if (!selectedSlotId) return;
    const variant =
      snapshot.classicBanner.variants.find((item) => item.sizeId === selectedSizeIdRef.current) ??
      snapshot.classicBanner.variants.find(
        (item) => item.sizeId === snapshot.classicBanner.masterSizeId,
      ) ??
      snapshot.classicBanner.variants[0];
    if (!variant) {
      setSelectedSlotId(null);
      return;
    }
    const layer = resolveClassicBannerFinalLayout(snapshot.classicBanner, variant).layerBySlot[
      selectedSlotId
    ];
    if (!layer || !layer.visible) {
      setSelectedSlotId(null);
    }
  }, [selectedSlotId]);

  const applyEditorSnapshot = useCallback(
    (
      nextSnapshot: ClassicBannerEditorSnapshot,
      options?: ClassicBannerEditorChangeOptions,
    ) => {
      const prev = getSnapshot();
      const next: ClassicBannerEditorSnapshot = {
        classicBanner: prepareClassicBannerData(nextSnapshot.classicBanner),
        assets: nextSnapshot.assets,
      };

      if (classicBannerEditorSnapshotsEqual(prev, next)) {
        return;
      }

      const historyResult = applyHistoryUpdate(
        historyRef.current,
        prev,
        next,
        classicBannerEditorSnapshotsEqual,
        cloneClassicBannerEditorSnapshot,
        {
          mode: options?.history,
          coalesceActive: historyCoalesceRef.current,
          lastCoalesceAt: historyCoalesceAtRef.current,
        },
      );
      historyRef.current = historyResult.stacks;
      historyCoalesceRef.current = historyResult.coalesceActive;
      historyCoalesceAtRef.current = historyResult.lastCoalesceAt;
      syncHistoryAvailability();

      classicBannerRef.current = next.classicBanner;
      assetsRef.current = next.assets;
      setClassicBanner(next.classicBanner);
      setAssets(next.assets);
      setSaveStatus("idle");
      setSaveError(null);
      repairSelectionAfterSnapshot(next);
    },
    [getSnapshot, repairSelectionAfterSnapshot, syncHistoryAvailability],
  );

  const handleClassicBannerChange = useCallback(
    (next: ClassicBannerProjectData, options?: ClassicBannerEditorChangeOptions) => {
      applyEditorSnapshot(
        {
          classicBanner: next,
          assets: assetsRef.current,
        },
        options,
      );
    },
    [applyEditorSnapshot],
  );

  const handleCombinedChange = useCallback(
    (
      classicBannerNext: ClassicBannerProjectData,
      assetsNext: BannerAsset[],
      options?: ClassicBannerEditorChangeOptions,
    ) => {
      applyEditorSnapshot(
        {
          classicBanner: classicBannerNext,
          assets: assetsNext,
        },
        options,
      );
    },
    [applyEditorSnapshot],
  );

  useEffect(() => {
    classicBannerRef.current = classicBanner;
  }, [classicBanner]);

  useEffect(() => {
    savedDataRef.current = savedData;
  }, [savedData]);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    savedAssetsRef.current = savedAssets;
  }, [savedAssets]);

  useEffect(() => {
    selectedSizeIdRef.current = selectedSizeId;
  }, [selectedSizeId]);

  useEffect(() => {
    const raw =
      project.classicBanner ?? createDefaultClassicBannerData(CLASSIC_BANNER_MASTER_SIZE_ID);
    const ready = prepareClassicBannerData(raw);
    if (JSON.stringify(raw.variants) === JSON.stringify(ready.variants)) return;
    persistClassicBannerProject(project, ready, project.assets ?? []);
  }, [project]);

  function handleLayerOverride(
    slotId: ClassicEditableSlotId,
    patch: Parameters<typeof patchClassicBannerLayerOverride>[3],
    options?: ClassicBannerEditorChangeOptions,
  ) {
    const next = prepareClassicBannerData(
      patchClassicBannerLayerOverride(
        classicBannerRef.current,
        selectedSizeIdRef.current,
        slotId,
        patch,
      ),
    );
    applyEditorSnapshot(
      {
        classicBanner: next,
        assets: assetsRef.current,
      },
      { history: options?.history ?? "replace" },
    );
  }

  const handleUndo = useCallback(() => {
    const present = getSnapshot();
    const result = undoHistoryStack(
      historyRef.current,
      present,
      cloneClassicBannerEditorSnapshot,
      cloneClassicBannerEditorSnapshot,
    );
    if (!result) return;

    historyRef.current = result.stacks;
    historyCoalesceRef.current = false;
    historyCoalesceAtRef.current = 0;
    classicBannerRef.current = result.state.classicBanner;
    assetsRef.current = result.state.assets;
    setClassicBanner(result.state.classicBanner);
    setAssets(result.state.assets);
    setSaveStatus("idle");
    setSaveError(null);
    repairSelectionAfterSnapshot(result.state);
    syncHistoryAvailability();
  }, [getSnapshot, repairSelectionAfterSnapshot, syncHistoryAvailability]);

  const handleRedo = useCallback(() => {
    const present = getSnapshot();
    const result = redoHistoryStack(
      historyRef.current,
      present,
      cloneClassicBannerEditorSnapshot,
      cloneClassicBannerEditorSnapshot,
    );
    if (!result) return;

    historyRef.current = result.stacks;
    historyCoalesceRef.current = false;
    historyCoalesceAtRef.current = 0;
    classicBannerRef.current = result.state.classicBanner;
    assetsRef.current = result.state.assets;
    setClassicBanner(result.state.classicBanner);
    setAssets(result.state.assets);
    setSaveStatus("idle");
    setSaveError(null);
    repairSelectionAfterSnapshot(result.state);
    syncHistoryAvailability();
  }, [getSnapshot, repairSelectionAfterSnapshot, syncHistoryAvailability]);

  function handleSelectVariant(sizeId: string) {
    setSelectedSlotId(null);
    setSelectedSizeId(sizeId);
  }

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const commitPersisted = useCallback((persistedProject: BannerProject) => {
    if (!persistedProject.classicBanner) return;
    setSavedData(persistedProject.classicBanner);
    savedDataRef.current = persistedProject.classicBanner;
    setSavedAssets(persistedProject.assets ?? []);
    savedAssetsRef.current = persistedProject.assets ?? [];
    setSaveStatus("saved");
    setSaveError(null);
  }, []);

  const flushPersistPending = useCallback(() => {
    clearAutosaveTimer();
    const current = classicBannerRef.current;
    const currentAssets = assetsRef.current;
    if (
      classicBannerEditorStateEqual(
        current,
        currentAssets,
        savedDataRef.current,
        savedAssetsRef.current,
      )
    ) {
      autosavePendingRef.current = false;
      return;
    }
    const persisted = persistClassicBannerProject(project, current, currentAssets);
    if (!persisted?.classicBanner) {
      setSaveError("Projekt nelze uložit — byl odstraněn z úložiště.");
      autosavePendingRef.current = false;
      return;
    }
    commitPersisted(persisted);
    autosavePendingRef.current = false;
  }, [clearAutosaveTimer, commitPersisted, project]);

  const hasUnsavedChanges = !classicBannerEditorStateEqual(
    classicBanner,
    assets,
    savedData,
    savedAssets,
  );

  useEffect(() => {
    if (
      classicBannerEditorStateEqual(
        classicBanner,
        assets,
        savedDataRef.current,
        savedAssetsRef.current,
      )
    ) {
      autosavePendingRef.current = false;
      return;
    }

    autosavePendingRef.current = true;
    clearAutosaveTimer();
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      const current = classicBannerRef.current;
      const currentAssets = assetsRef.current;
      if (
        classicBannerEditorStateEqual(
          current,
          currentAssets,
          savedDataRef.current,
          savedAssetsRef.current,
        )
      ) {
        autosavePendingRef.current = false;
        return;
      }
      const persisted = persistClassicBannerProject(project, current, currentAssets);
      if (!persisted?.classicBanner) {
        setSaveError("Projekt nelze uložit — byl odstraněn z úložiště.");
        autosavePendingRef.current = false;
        return;
      }
      commitPersisted(persisted);
      autosavePendingRef.current = false;
    }, AUTOSAVE_DEBOUNCE_MS);

    return clearAutosaveTimer;
  }, [classicBanner, assets, project, clearAutosaveTimer, commitPersisted]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      const dirty =
        !classicBannerEditorStateEqual(
          classicBannerRef.current,
          assetsRef.current,
          savedDataRef.current,
          savedAssetsRef.current,
        ) || autosavePendingRef.current;
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }

    function onPageHide() {
      if (
        classicBannerEditorStateEqual(
          classicBannerRef.current,
          assetsRef.current,
          savedDataRef.current,
          savedAssetsRef.current,
        )
      ) {
        return;
      }
      flushPersistPending();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [flushPersistPending]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableKeyboardTarget(e.target)) return;

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
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRedo, handleUndo]);

  function handleSave() {
    clearAutosaveTimer();
    autosavePendingRef.current = false;
    if (!getStoredProjectById(project.id)) {
      setSaveError("Projekt byl odstraněn. Vraťte se na přehled.");
      setSaveStatus("idle");
      return;
    }
    const persisted = persistClassicBannerProject(project, classicBanner, assets);
    if (!persisted?.classicBanner) {
      setSaveError("Projekt byl odstraněn. Vraťte se na přehled.");
      setSaveStatus("idle");
      return;
    }
    commitPersisted(persisted);
  }

  const selectedVariant =
    classicBanner.variants.find((variant) => variant.sizeId === selectedSizeId) ??
    classicBanner.variants.find((variant) => variant.sizeId === classicBanner.masterSizeId) ??
    classicBanner.variants[0];

  async function handleExportPng() {
    if (!selectedVariant) {
      setExportMode("idle");
      setExportIsError(true);
      setExportMessage("Export se nepovedl");
      return;
    }

    setExportMode("png");
    setExportMessage(null);
    setExportIsError(false);

    try {
      const { blob, warnings } = await exportClassicBannerVariantToPng(
        classicBanner,
        selectedVariant,
      );
      const downloaded = downloadBlob(blob, classicBannerPngFilename(selectedVariant.sizeId));
      if (!downloaded) {
        throw new Error("Export se nepovedl");
      }

      setExportMode("idle");
      setExportIsError(false);
      setExportMessage(
        warnings.length > 0 ? `PNG exportováno. ${warnings.join(" ")}` : "PNG exportováno",
      );
      window.setTimeout(() => {
        setExportMessage(null);
      }, 4000);
    } catch (error) {
      setExportMode("idle");
      setExportIsError(true);
      setExportMessage(error instanceof Error ? error.message : "Export se nepovedl");
    }
  }

  async function handleExportZip() {
    setExportMode("zip");
    setExportMessage(null);
    setExportIsError(false);

    try {
      const { blob, warnings, exportedCount } = await exportClassicBannerAllVariantsToZip(
        classicBanner,
      );
      const downloaded = downloadBlob(blob, classicBannerZipFilename(project.name));
      if (!downloaded) {
        throw new Error("ZIP export se nepovedl");
      }

      setExportMode("idle");
      setExportIsError(false);
      const baseMessage = `ZIP exportován (${exportedCount} PNG)`;
      setExportMessage(
        warnings.length > 0 ? `${baseMessage}. ${warnings.join(" ")}` : baseMessage,
      );
      window.setTimeout(() => {
        setExportMessage(null);
      }, 5000);
    } catch (error) {
      setExportMode("idle");
      setExportIsError(true);
      setExportMessage(error instanceof Error ? error.message : "ZIP export se nepovedl");
    }
  }

  if (!selectedVariant) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-sm text-zinc-500">
        Projekt nemá žádné varianty banneru.
      </div>
    );
  }

  const previewRecommendations = getClassicBannerRecommendations(classicBanner, selectedVariant);

  return (
    <div className="flex h-[100dvh] flex-col bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Zpět
            </Link>
            <span className="hidden text-zinc-700 sm:inline" aria-hidden="true">|</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-semibold text-zinc-100 sm:text-lg">
                  {project.name}
                </h1>
                <ProjectStatusBadge status={project.status} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-violet-400/90">
                Klasický statický banner · {selectedVariant.sizeId}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {hasUnsavedChanges ? (
              <span className="text-sm font-medium text-amber-400">Neuložené změny</span>
            ) : saveStatus === "saved" ? (
              <span className="text-sm font-medium text-emerald-400">Uloženo lokálně</span>
            ) : (
              <span className="text-sm text-zinc-600">Uloženo v prohlížeči</span>
            )}
            {saveError ? (
              <span className="text-sm font-medium text-red-400" role="alert">
                {saveError}
              </span>
            ) : null}
            {exportMessage ? (
              <span
                className={`text-sm font-medium ${
                  exportIsError ? "text-red-400" : "text-emerald-400"
                }`}
                role={exportIsError ? "alert" : "status"}
              >
                {exportMessage}
              </span>
            ) : null}
            <EditorUndoRedoButtons
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
            <button
              type="button"
              onClick={() => void handleExportPng()}
              disabled={isExporting}
              className="inline-flex items-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportMode === "png" ? "Exportuji…" : "Export PNG"}
            </button>
            <button
              type="button"
              onClick={() => void handleExportZip()}
              disabled={isExporting}
              className="inline-flex items-center rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:border-emerald-700 hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportMode === "zip" ? "Exportuji ZIP…" : "Export všech PNG"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              aria-label={hasUnsavedChanges ? "Uložit změny projektu" : "Žádné změny k uložení"}
              className="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Uložit
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex h-48 shrink-0 flex-col border-b border-zinc-800/80 bg-zinc-900/30 lg:h-auto lg:w-56 lg:border-b-0 lg:border-r xl:w-64">
          <ClassicVariantSwitcher
            variants={classicBanner.variants}
            selectedSizeId={selectedSizeId}
            onSelect={handleSelectVariant}
          />
          <ClassicLayerList
            data={classicBanner}
            variant={selectedVariant}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
            onChange={handleClassicBannerChange}
          />
        </aside>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950/50">
          <div className="flex min-h-0 flex-1 flex-col">
            <ClassicBannerPreview
              variant={selectedVariant}
              data={classicBanner}
              assets={assets}
              viewZoom={viewZoom}
              onViewZoomChange={setViewZoom}
              selectedSlotId={selectedSlotId}
              onSelectSlot={setSelectedSlotId}
              onLayerOverride={handleLayerOverride}
            />
          </div>
          <ClassicBannerWarnings
            recommendations={previewRecommendations}
            className="shrink-0 border-t border-zinc-800/60 px-6 py-3"
          />
        </main>

        <aside className="h-80 shrink-0 border-t border-zinc-800/80 bg-zinc-900/40 lg:h-auto lg:w-80 lg:border-l lg:border-t-0 xl:w-96">
          <ClassicBannerInspector
            data={classicBanner}
            projectId={project.id}
            assets={assets}
            selectedVariant={selectedVariant}
            selectedSlotId={selectedSlotId}
            onChange={handleClassicBannerChange}
            onCombinedChange={handleCombinedChange}
          />
        </aside>
      </div>
    </div>
  );
}
