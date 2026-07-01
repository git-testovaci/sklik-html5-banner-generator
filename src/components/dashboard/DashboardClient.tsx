"use client";

import { useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import { computeDashboardStats } from "@/lib/mock-projects";
import {
  deleteProjectById,
  getProjectsServerSnapshot,
  loadProjectsFromStorage,
  resetProjectsToSeed,
  subscribeProjects,
} from "@/lib/project-storage";
import type { DashboardStats } from "@/types/project";
import { DashboardHeader } from "./DashboardHeader";
import { EmptyProjectsState } from "./EmptyProjectsState";
import { NewClassicProjectDialog } from "./NewClassicProjectDialog";
import { NewProjectDialog } from "./NewProjectDialog";
import { ProjectCard } from "./ProjectCard";

const STAT_CARDS: {
  key: keyof DashboardStats;
  label: string;
  accent: string;
}[] = [
  { key: "total", label: "Celkem projektů", accent: "text-zinc-100" },
  { key: "drafts", label: "Koncepty", accent: "text-zinc-400" },
  { key: "shared", label: "Sdílené", accent: "text-sky-400" },
  { key: "exported", label: "Exportované", accent: "text-emerald-400" },
];

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function useStoredProjects() {
  return useSyncExternalStore(
    subscribeProjects,
    loadProjectsFromStorage,
    getProjectsServerSnapshot,
  );
}

function LocalStorageNotice() {
  return (
    <aside
      aria-label="Local storage notice"
      className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400"
    >
      <p>
        Projekty a obrázky zůstávají v tomto prohlížeči. Export ZIP funguje lokálně.
        Veřejný náhled s obrázky funguje nejlépe na stejném zařízení.
      </p>
    </aside>
  );
}

export function DashboardClient() {
  const router = useRouter();
  const isClient = useIsClient();
  const projects = useStoredProjects();
  const [html5DialogOpen, setHtml5DialogOpen] = useState(false);
  const [classicDialogOpen, setClassicDialogOpen] = useState(false);

  const stats = computeDashboardStats(projects);

  function handleDelete(projectId: string) {
    deleteProjectById(projectId);
  }

  function handleCreated(projectId: string) {
    router.push(`/editor/${projectId}`);
  }

  function handleResetDemoData() {
    const confirmed = window.confirm(
      "Resetovat ukázková data?\n\nSmaže všechny uložené projekty v tomto prohlížeči a obnoví výchozí ukázky. Import v aktuální záložce zůstane nedotčen.",
    );
    if (confirmed) {
      resetProjectsToSeed();
    }
  }

  if (!isClient) {
    return (
      <div className="flex min-h-full flex-col">
        <div className="border-b border-zinc-800/80 px-4 py-6">
          <div className="mx-auto h-8 max-w-7xl animate-pulse rounded bg-zinc-800/60" />
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl bg-zinc-900/60"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <DashboardHeader
        onNewHtml5Banner={() => setHtml5DialogOpen(true)}
        onNewClassicBanner={() => setClassicDialogOpen(true)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <LocalStorageNotice />

        <section aria-labelledby="stats-heading" className="mt-6">
          <h2 id="stats-heading" className="sr-only">
            Statistiky projektů
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STAT_CARDS.map(({ key, label, accent }) => (
              <div
                key={key}
                className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-5"
              >
                <p className="text-sm font-medium text-zinc-500">{label}</p>
                <p className={`mt-2 text-3xl font-semibold tabular-nums ${accent}`}>
                  {stats[key]}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="projects-heading">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2
              id="projects-heading"
              className="text-lg font-semibold text-zinc-200"
            >
              Projekty
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-zinc-500">
                {projects.length}{" "}
                {projects.length === 1 ? "projekt" : projects.length < 5 ? "projekty" : "projektů"}
              </p>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-300"
              >
                Resetovat ukázková data
              </button>
            </div>
          </div>

          {projects.length === 0 ? (
            <EmptyProjectsState
              onCreateHtml5={() => setHtml5DialogOpen(true)}
              onCreateClassic={() => setClassicDialogOpen(true)}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectCard project={project} onDelete={handleDelete} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <NewProjectDialog
        open={html5DialogOpen}
        onClose={() => setHtml5DialogOpen(false)}
        onCreated={handleCreated}
      />
      <NewClassicProjectDialog
        open={classicDialogOpen}
        onClose={() => setClassicDialogOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
