"use client";

import Link from "next/link";
import { formatBannerSize } from "@/lib/banner-sizes";
import type { BannerProject } from "@/types/project";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

interface ProjectCardProps {
  project: BannerProject;
  onDelete: (projectId: string) => void;
}

function formatUpdatedDate(isoDate: string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const canPreview =
    project.status !== "draft" && project.shareId.length > 0;
  const sizeLabel = formatBannerSize(project.width, project.height);

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${project.name}"? This action cannot be undone.`,
    );
    if (confirmed) {
      onDelete(project.id);
    }
  }

  return (
    <article className="group flex flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-sm transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/80">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-zinc-100">
            {project.name}
          </h2>
          <p className="mt-1 font-mono text-sm text-zinc-500">{sizeLabel}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <p className="mb-1 line-clamp-1 text-sm font-medium text-zinc-300">
        {project.headline}
      </p>
      <p className="mb-4 line-clamp-1 text-sm text-zinc-500">
        {project.subheadline}
      </p>

      <p className="mb-5 text-xs text-zinc-600">
        Updated {formatUpdatedDate(project.updatedAt)}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-zinc-800/60 pt-4">
        <Link
          href={`/editor/${project.id}`}
          className="inline-flex items-center rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          Open editor
        </Link>

        {canPreview ? (
          <Link
            href={`/preview/${project.shareId}`}
            className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-3.5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
          >
            Preview
          </Link>
        ) : (
          <span
            className="inline-flex cursor-not-allowed items-center rounded-lg border border-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-600"
            aria-disabled="true"
            title="Preview available after sharing"
          >
            Preview
          </span>
        )}

        <button
          type="button"
          onClick={handleDelete}
          aria-label={`Delete project ${project.name}`}
          className="ml-auto inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950/30 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
