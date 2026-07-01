"use client";

import Link from "next/link";
import { getClassicBannerSizeById } from "@/lib/classic-banner/classic-banner-sizes";
import { getClassicBannerData } from "@/lib/classic-banner/classic-banner-model";
import type { BannerProject } from "@/types/project";
import { ProjectStatusBadge } from "@/components/dashboard/ProjectStatusBadge";

interface ClassicBannerPlaceholderProps {
  project: BannerProject;
}

export function ClassicBannerPlaceholder({ project }: ClassicBannerPlaceholderProps) {
  const data = getClassicBannerData(project);
  const masterSize = data ? getClassicBannerSizeById(data.masterSizeId) : undefined;
  const variantCount = data?.variants.length ?? 0;
  const content = data?.content;

  return (
    <div className="flex min-h-full flex-col bg-zinc-950">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-400">
              Klasický banner
            </p>
            <h1 className="truncate text-lg font-semibold text-zinc-100 sm:text-xl">
              {project.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ProjectStatusBadge status={project.status} />
            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
            >
              Zpět na přehled
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-zinc-100">Klasický banner</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Základ projektu je připraven. Další fáze přidá editor variant a PNG export.
          </p>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Počet variant
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">
                {variantCount}
              </dd>
            </div>
            <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Hlavní velikost
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">
                {masterSize ? `${masterSize.width}×${masterSize.height}` : data?.masterSizeId ?? "—"}
              </dd>
            </div>
          </dl>

          {content ? (
            <section className="mt-8 border-t border-zinc-800/60 pt-6">
              <h3 className="text-sm font-semibold text-zinc-200">Výchozí obsah</h3>
              <ul className="mt-4 space-y-3 text-sm text-zinc-400">
                <li>
                  <span className="font-medium text-zinc-300">Nadpis:</span>{" "}
                  <span className="whitespace-pre-line">{content.headline}</span>
                </li>
                <li>
                  <span className="font-medium text-zinc-300">Slogan:</span> {content.slogan}
                </li>
                <li>
                  <span className="font-medium text-zinc-300">CTA:</span> {content.ctaText}
                </li>
                <li>
                  <span className="font-medium text-zinc-300">Badge:</span> {content.badgeText}
                </li>
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
