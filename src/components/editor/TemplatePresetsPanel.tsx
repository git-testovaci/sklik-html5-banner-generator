"use client";

import { applyStoryboardTemplate } from "@/lib/templates/storyboard-templates";
import {
  STORYBOARD_TEMPLATE_CATEGORIES,
  STORYBOARD_TEMPLATES,
} from "@/lib/templates/storyboard-templates";
import { applyTemplateToState } from "@/lib/templates/apply-template";
import { BANNER_TEMPLATES } from "@/lib/templates/banner-templates";
import { getLayersForScene, setActiveScene } from "@/lib/animation/storyboard-utils";
import { selectionForBannerLayer } from "@/lib/animation/layer-timeline-utils";
import type { StoryboardTemplateId } from "@/types/storyboard-templates";
import type { BannerEditorState, BannerEditorStateUpdater, SelectedLayer } from "@/types/editor";
import type { BannerTemplateId } from "@/types/templates";

export interface TemplateApplyMeta {
  message?: string;
  switchToAssets?: boolean;
}

interface TemplatePresetsPanelProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  hasUnsavedChanges: boolean;
  onAfterApply?: (
    next: BannerEditorState,
    selection: SelectedLayer,
    meta?: TemplateApplyMeta,
  ) => void;
}

const SLOT_LABELS: Record<string, string> = {
  logo: "Logo",
  product: "Produkt",
  background: "Pozadí",
  badge: "Odznak",
  image: "Obrázek",
};

function firstEditableSelection(state: BannerEditorState): SelectedLayer {
  const sceneId = state.activeSceneId ?? state.scenes?.[0]?.id;
  if (!sceneId) return { type: "asset", id: "__none__" };
  const layers = getLayersForScene(state, sceneId)
    .filter((l) => l.visible && l.type !== "particle")
    .sort((a, b) => b.zIndex - a.zIndex);
  const layer = layers.find((l) => l.type === "text") ?? layers[0];
  if (!layer) return { type: "asset", id: "__none__" };
  return selectionForBannerLayer(layer);
}

export function TemplatePresetsPanel({
  state,
  onUpdate,
  onAfterApply,
}: TemplatePresetsPanelProps) {
  function applyStoryboard(id: StoryboardTemplateId) {
    let next = applyStoryboardTemplate(state, id);
    const firstSceneId = next.scenes?.[0]?.id;
    if (firstSceneId) {
      next = setActiveScene(next, firstSceneId);
    }
    onUpdate(next);
    const selection = firstEditableSelection(next);
    onAfterApply?.(next, selection, {
      message:
        "Šablona je připravená. Přidejte média na časovou osu nebo vyplňte sloty.",
      switchToAssets: true,
    });
  }

  function applyLayout(templateId: BannerTemplateId) {
    const next = applyTemplateToState(state, templateId);
    onUpdate(next);
    onAfterApply?.(next, firstEditableSelection(next), {
      message: "Layout aplikován. Upravte vrstvy na plátně a časové ose.",
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Šablony</h2>
        <p className="mt-0.5 text-[10px] text-zinc-500">
          Vytvoří scény, vrstvy a časovou osu
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Vyberte šablonu a hned upravíte texty, média a animace.
        </p>
      </div>

      <div className="space-y-4 p-3">
        {STORYBOARD_TEMPLATE_CATEGORIES.map((cat) => {
          const items = STORYBOARD_TEMPLATES.filter((t) => t.category === cat.id);
          if (items.length === 0) return null;
          return (
            <div key={cat.id}>
              <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {cat.label}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {items.map((template) => (
                  <div
                    key={template.id}
                    className={`rounded-lg border px-3 py-2.5 ${
                      template.recommended
                        ? "border-violet-700/70 bg-violet-950/30"
                        : "border-zinc-800/60 bg-zinc-950/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-zinc-100">{template.name}</p>
                      {template.recommended ? (
                        <span className="shrink-0 rounded bg-violet-800/60 px-1.5 py-0.5 text-[9px] text-violet-200">
                          Doporučeno
                        </span>
                      ) : null}
                    </div>
                    {template.tags && template.tags.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-1 text-[10px] leading-snug text-zinc-500">
                      {template.description}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-600">
                      {template.sceneCount} scén · {Math.round(template.totalDurationMs / 1000)} s
                      {template.transitionStyle ? ` · ${template.transitionStyle}` : ""}
                    </p>
                    {template.keyEffects.length > 0 ? (
                      <p className="mt-0.5 text-[10px] text-zinc-600">
                        Animace: {template.keyEffects.slice(0, 3).join(", ")}
                      </p>
                    ) : null}
                    {template.requiredSlots && template.requiredSlots.length > 0 ? (
                      <p className="mt-1 text-[10px] text-zinc-500">
                        Sloty:{" "}
                        {template.requiredSlots
                          .map((s) => SLOT_LABELS[s.kind] ?? s.label)
                          .join(" · ")}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => applyStoryboard(template.id)}
                      className="mt-2 w-full rounded border border-violet-700/50 bg-violet-950/40 py-1.5 text-[10px] font-medium text-violet-200 hover:bg-violet-900/40"
                    >
                      Použít šablonu
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div>
          <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Jednoduché layouty
          </p>
          <p className="mb-2 px-1 text-[10px] text-zinc-600">
            Jedna scéna — vhodné pro rychlý start bez storyboardu.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BANNER_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyLayout(template.id)}
                className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2 text-left hover:border-zinc-700"
              >
                <p className="text-xs font-medium text-zinc-200">{template.name}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
