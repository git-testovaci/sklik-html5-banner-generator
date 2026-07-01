"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createDefaultClassicBannerData } from "@/lib/classic-banner/classic-banner-defaults";
import { CLASSIC_BANNER_MASTER_SIZE_ID } from "@/lib/classic-banner/classic-banner-sizes";
import {
  classicBannerDataEqual,
  mergeClassicBannerIntoProject,
  prepareClassicBannerData,
} from "@/lib/classic-banner/classic-banner-update";
import { getClassicBannerRecommendations } from "@/lib/classic-banner/classic-banner-recommendations";
import { getStoredProjectById, upsertProject } from "@/lib/project-storage";
import type { ClassicBannerProjectData } from "@/types/classic-banner";
import type { BannerProject } from "@/types/project";
import { ProjectStatusBadge } from "@/components/dashboard/ProjectStatusBadge";
import { ClassicBannerInspector } from "./ClassicBannerInspector";
import { ClassicBannerPreview } from "./ClassicBannerPreview";
import { ClassicBannerWarnings } from "./ClassicBannerWarnings";
import { ClassicVariantSwitcher } from "./ClassicVariantSwitcher";

const AUTOSAVE_DEBOUNCE_MS = 750;

interface ClassicBannerEditorProps {
  project: BannerProject;
}

function persistClassicBannerProject(
  project: BannerProject,
  classicBanner: ClassicBannerProjectData,
): BannerProject | null {
  const existing = getStoredProjectById(project.id);
  if (!existing) return null;
  const next = mergeClassicBannerIntoProject(existing, classicBanner);
  upsertProject(next);
  return next;
}

export function ClassicBannerEditor({ project }: ClassicBannerEditorProps) {
  const rawInitial =
    project.classicBanner ?? createDefaultClassicBannerData(CLASSIC_BANNER_MASTER_SIZE_ID);
  const initialData = prepareClassicBannerData(rawInitial);

  const [classicBanner, setClassicBanner] = useState<ClassicBannerProjectData>(initialData);
  const [savedData, setSavedData] = useState<ClassicBannerProjectData>(initialData);
  const [selectedSizeId, setSelectedSizeId] = useState(
    initialData.masterSizeId || CLASSIC_BANNER_MASTER_SIZE_ID,
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const classicBannerRef = useRef(classicBanner);
  const savedDataRef = useRef(savedData);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosavePendingRef = useRef(false);

  useEffect(() => {
    classicBannerRef.current = classicBanner;
  }, [classicBanner]);

  useEffect(() => {
    savedDataRef.current = savedData;
  }, [savedData]);

  useEffect(() => {
    const raw =
      project.classicBanner ?? createDefaultClassicBannerData(CLASSIC_BANNER_MASTER_SIZE_ID);
    const ready = prepareClassicBannerData(raw);
    if (JSON.stringify(raw.variants) === JSON.stringify(ready.variants)) return;
    persistClassicBannerProject(project, ready);
  }, [project]);

  function handleClassicBannerChange(next: ClassicBannerProjectData) {
    setClassicBanner(prepareClassicBannerData(next));
  }

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const commitPersisted = useCallback((persisted: ClassicBannerProjectData) => {
    setSavedData(persisted);
    savedDataRef.current = persisted;
    setSaveStatus("saved");
    setSaveError(null);
  }, []);

  const flushPersistPending = useCallback(() => {
    clearAutosaveTimer();
    const current = classicBannerRef.current;
    if (classicBannerDataEqual(current, savedDataRef.current)) {
      autosavePendingRef.current = false;
      return;
    }
    const persisted = persistClassicBannerProject(project, current);
    if (!persisted?.classicBanner) {
      setSaveError("Projekt nelze uložit — byl odstraněn z úložiště.");
      autosavePendingRef.current = false;
      return;
    }
    commitPersisted(persisted.classicBanner);
    autosavePendingRef.current = false;
  }, [clearAutosaveTimer, commitPersisted, project]);

  const hasUnsavedChanges = !classicBannerDataEqual(classicBanner, savedData);

  useEffect(() => {
    if (classicBannerDataEqual(classicBanner, savedDataRef.current)) {
      autosavePendingRef.current = false;
      return;
    }

    autosavePendingRef.current = true;
    clearAutosaveTimer();
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      const current = classicBannerRef.current;
      if (classicBannerDataEqual(current, savedDataRef.current)) {
        autosavePendingRef.current = false;
        return;
      }
      const persisted = persistClassicBannerProject(project, current);
      if (!persisted?.classicBanner) {
        setSaveError("Projekt nelze uložit — byl odstraněn z úložiště.");
        autosavePendingRef.current = false;
        return;
      }
      commitPersisted(persisted.classicBanner);
      autosavePendingRef.current = false;
    }, AUTOSAVE_DEBOUNCE_MS);

    return clearAutosaveTimer;
  }, [classicBanner, project, clearAutosaveTimer, commitPersisted]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      const dirty =
        !classicBannerDataEqual(classicBannerRef.current, savedDataRef.current) ||
        autosavePendingRef.current;
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }

    function onPageHide() {
      if (classicBannerDataEqual(classicBannerRef.current, savedDataRef.current)) return;
      flushPersistPending();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [flushPersistPending]);

  function handleSave() {
    clearAutosaveTimer();
    autosavePendingRef.current = false;
    if (!getStoredProjectById(project.id)) {
      setSaveError("Projekt byl odstraněn. Vraťte se na přehled.");
      setSaveStatus("idle");
      return;
    }
    const persisted = persistClassicBannerProject(project, classicBanner);
    if (!persisted?.classicBanner) {
      setSaveError("Projekt byl odstraněn. Vraťte se na přehled.");
      setSaveStatus("idle");
      return;
    }
    commitPersisted(persisted.classicBanner);
  }

  const selectedVariant =
    classicBanner.variants.find((variant) => variant.sizeId === selectedSizeId) ??
    classicBanner.variants.find((variant) => variant.sizeId === classicBanner.masterSizeId) ??
    classicBanner.variants[0];

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
        <aside className="h-48 shrink-0 border-b border-zinc-800/80 bg-zinc-900/30 lg:h-auto lg:w-56 lg:border-b-0 lg:border-r xl:w-64">
          <ClassicVariantSwitcher
            variants={classicBanner.variants}
            selectedSizeId={selectedSizeId}
            onSelect={setSelectedSizeId}
          />
        </aside>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto bg-zinc-950/50 p-6">
          <ClassicBannerPreview variant={selectedVariant} data={classicBanner} />
          <ClassicBannerWarnings
            recommendations={previewRecommendations}
            className="mt-4 w-full max-w-md"
          />
        </main>

        <aside className="h-80 shrink-0 border-t border-zinc-800/80 bg-zinc-900/40 lg:h-auto lg:w-80 lg:border-l lg:border-t-0 xl:w-96">
          <ClassicBannerInspector
            data={classicBanner}
            selectedVariant={selectedVariant}
            onChange={handleClassicBannerChange}
          />
        </aside>
      </div>
    </div>
  );
}
