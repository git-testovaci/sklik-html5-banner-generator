"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BANNER_SIZES } from "@/lib/banner-sizes";
import {
  getDefaultImportProjectValues,
} from "@/lib/html5-import/analyze-imported-banner";
import { createBannerProjectFromImport } from "@/lib/project-factory";
import { upsertProject } from "@/lib/project-storage";
import { BANNER_ANIMATIONS } from "@/types/editor";
import type { ImportedBannerAnalysis } from "@/types/imported-banner";

interface CreateProjectFromImportPanelProps {
  analysis: ImportedBannerAnalysis;
}

export function CreateProjectFromImportPanel({
  analysis,
}: CreateProjectFromImportPanelProps) {
  const router = useRouter();
  const defaults = getDefaultImportProjectValues(analysis);

  const [name, setName] = useState(defaults.name);
  const [sizeValue, setSizeValue] = useState(`${defaults.width}x${defaults.height}`);
  const [headline, setHeadline] = useState(defaults.headline);
  const [subheadline, setSubheadline] = useState(defaults.subheadline);
  const [cta, setCta] = useState(defaults.cta);
  const [animation, setAnimation] = useState(defaults.animation);

  const canCreate = name.trim().length > 0;

  function handleCreate() {
    if (!canCreate) return;

    const [width, height] = sizeValue.split("x").map(Number);
    const project = createBannerProjectFromImport({
      name: name.trim(),
      width,
      height,
      headline: headline.trim(),
      subheadline: subheadline.trim(),
      cta: cta.trim(),
      animation,
    });
    upsertProject(project);
    router.push(`/editor/${project.id}`);
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">
          Create editable project from analysis
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Starts a new studio project using extracted text and detected size.
          This does not convert arbitrary HTML into editable layers.
        </p>
      </div>
      <div className="space-y-3 p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Project name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Banner size</span>
          <select
            value={sizeValue}
            onChange={(e) => setSizeValue(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            {BANNER_SIZES.map((s) => (
              <option key={s.label} value={`${s.width}x${s.height}`}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Headline</span>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Subheadline</span>
          <input
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">CTA</span>
          <input
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Animation</span>
          <select
            value={animation}
            onChange={(e) => setAnimation(e.target.value as typeof animation)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            {BANNER_ANIMATIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate}
          className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create project & open editor
        </button>
      </div>
    </section>
  );
}
