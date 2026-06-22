import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyProjectsState } from "@/components/dashboard/EmptyProjectsState";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import {
  MOCK_PROJECTS,
  computeDashboardStats,
} from "@/lib/mock-projects";
import type { DashboardStats } from "@/types/project";

export const metadata: Metadata = {
  title: "Dashboard — Sklik HTML5 Banner Generator",
  description: "Internal studio for HTML5 banner production",
};

const STAT_CARDS: {
  key: keyof DashboardStats;
  label: string;
  accent: string;
}[] = [
  { key: "total", label: "Total projects", accent: "text-zinc-100" },
  { key: "drafts", label: "Drafts", accent: "text-zinc-400" },
  { key: "shared", label: "Shared", accent: "text-sky-400" },
  { key: "exported", label: "Exported", accent: "text-emerald-400" },
];

export default function DashboardPage() {
  const projects = MOCK_PROJECTS;
  const stats = computeDashboardStats(projects);

  return (
    <div className="flex min-h-full flex-col">
      <DashboardHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Project statistics
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
          <div className="mb-6 flex items-center justify-between">
            <h2
              id="projects-heading"
              className="text-lg font-semibold text-zinc-200"
            >
              Projects
            </h2>
            <p className="text-sm text-zinc-500">
              {projects.length}{" "}
              {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>

          {projects.length === 0 ? (
            <EmptyProjectsState />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectCard project={project} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
