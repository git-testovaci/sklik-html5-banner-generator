"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BANNER_SIZES } from "@/lib/banner-sizes";
import { getDefaultImportProjectValues } from "@/lib/html5-import/analyze-imported-banner";
import {
  attachImportAssetsToProject,
  type ImportAssetSelection,
} from "@/lib/html5-import/imported-banner-assets";
import { createBannerProjectFromImport } from "@/lib/project-factory";
import { upsertProject } from "@/lib/project-storage";
import { BANNER_ANIMATIONS } from "@/types/editor";
import type { ImportedBannerAnalysis } from "@/types/imported-banner";

interface CreateProjectFromImportPanelProps {
  analysis: ImportedBannerAnalysis;
  sourceZipFile: File | null;
}

export function CreateProjectFromImportPanel({
  analysis,
  sourceZipFile,
}: CreateProjectFromImportPanelProps) {
  const router = useRouter();
  const defaults = getDefaultImportProjectValues(analysis);
  const images = useMemo(
    () => analysis.imageSummaries ?? [],
    [analysis.imageSummaries],
  );

  const logoDefault = images.find((i) => i.suggestedRole === "logo")?.path;
  const productDefault =
    images.find((i) => i.suggestedRole === "product")?.path ??
    images[0]?.path;
  const bgDefault = images.find((i) => i.suggestedRole === "background")?.path;

  const [name, setName] = useState(defaults.name);
  const [sizeValue, setSizeValue] = useState(`${defaults.width}x${defaults.height}`);
  const [headline, setHeadline] = useState(defaults.headline);
  const [subheadline, setSubheadline] = useState(defaults.subheadline);
  const [cta, setCta] = useState(defaults.cta);
  const [animation, setAnimation] = useState(defaults.animation);
  const [importLogo, setImportLogo] = useState(Boolean(logoDefault));
  const [importProduct, setImportProduct] = useState(Boolean(productDefault));
  const [importBg, setImportBg] = useState(Boolean(bgDefault));
  const [logoPath, setLogoPath] = useState(logoDefault ?? "");
  const [productPath, setProductPath] = useState(productDefault ?? "");
  const [bgPath, setBgPath] = useState(bgDefault ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = name.trim().length > 0;

  const imageOptions = useMemo(
    () => images.map((i) => ({ value: i.path, label: `${i.name} (${Math.round(i.size / 1024)} kB)` })),
    [images],
  );

  async function handleCreate() {
    if (!canCreate || busy) return;
    setBusy(true);
    setError(null);

    try {
      const [width, height] = sizeValue.split("x").map(Number);
      let project = createBannerProjectFromImport({
        name: name.trim(),
        width,
        height,
        headline: headline.trim(),
        subheadline: subheadline.trim(),
        cta: cta.trim(),
        animation,
        animationComplexity: analysis.animationInsights.complexity,
      });

      if (sourceZipFile && images.length > 0) {
        const selection: ImportAssetSelection = {};
        if (importLogo && logoPath) selection.logoPath = logoPath;
        if (importProduct && productPath) selection.productPath = productPath;
        if (importBg && bgPath) selection.backgroundPath = bgPath;
        project = await attachImportAssetsToProject(project, sourceZipFile, selection);
      }

      upsertProject(project);
      router.push(`/editor/${project.id}`);
    } catch {
      setError("Could not create project. Try again without image import.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">
          Create editable project from analysis
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Reuses extracted text and optional ZIP images as assets. Layout is rebuilt — not a full HTML conversion.
        </p>
      </div>
      <div className="space-y-3 p-4">
        {images.length > 0 && sourceZipFile ? (
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3 text-xs">
            <p className="font-medium text-zinc-300">{images.length} image(s) detected in ZIP</p>
            <p className="mt-1 text-zinc-500">Imported images are reused as assets, layout is rebuilt.</p>
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-zinc-400">
                <input type="checkbox" checked={importProduct} onChange={(e) => setImportProduct(e.target.checked)} />
                Product image
                <select value={productPath} onChange={(e) => setProductPath(e.target.value)} className="ml-auto max-w-[55%] rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-200">
                  {imageOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              {logoDefault || images.length ? (
                <label className="flex items-center gap-2 text-zinc-400">
                  <input type="checkbox" checked={importLogo} onChange={(e) => setImportLogo(e.target.checked)} />
                  Logo
                  <select value={logoPath} onChange={(e) => setLogoPath(e.target.value)} className="ml-auto max-w-[55%] rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-200">
                    {imageOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-zinc-400">
                <input type="checkbox" checked={importBg} onChange={(e) => setImportBg(e.target.checked)} />
                Background
                <select value={bgPath} onChange={(e) => setBgPath(e.target.value)} className="ml-auto max-w-[55%] rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-200">
                  {imageOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : images.length > 0 ? (
          <p className="text-xs text-zinc-500">Re-import ZIP to enable image asset extraction.</p>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Project name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Banner size</span>
          <select value={sizeValue} onChange={(e) => setSizeValue(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
            {BANNER_SIZES.map((s) => (
              <option key={s.label} value={`${s.width}x${s.height}`}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Headline</span>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Subheadline</span>
          <input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">CTA</span>
          <input value={cta} onChange={(e) => setCta(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Animation</span>
          <select value={animation} onChange={(e) => setAnimation(e.target.value as typeof animation)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
            {BANNER_ANIMATIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </label>
        {error ? <p className="text-xs text-red-400" role="alert">{error}</p> : null}
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!canCreate || busy}
          className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create project & open editor"}
        </button>
      </div>
    </section>
  );
}
