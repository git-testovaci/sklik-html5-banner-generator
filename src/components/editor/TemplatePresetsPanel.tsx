"use client";

import { applyIonicCareSequence, applyTemplateToState } from "@/lib/templates/apply-template";
import { BANNER_TEMPLATES } from "@/lib/templates/banner-templates";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import type { BannerTemplateId } from "@/types/templates";

interface TemplatePresetsPanelProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  hasUnsavedChanges: boolean;
}

export function TemplatePresetsPanel({
  state,
  onUpdate,
  hasUnsavedChanges,
}: TemplatePresetsPanelProps) {
  function applyTemplate(templateId: BannerTemplateId) {
    if (hasUnsavedChanges) {
      const ok = window.confirm(
        "Apply layout template? This changes layer positions and animations. Unsaved layout changes will be overwritten in the editor (save first if needed).",
      );
      if (!ok) return;
    }
    onUpdate(applyTemplateToState(state, templateId));
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Layout templates</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Try the Ionic Care storyboard below, or pick a single-scene layout.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            if (hasUnsavedChanges) {
              const ok = window.confirm(
                "Apply Ionic Care 3-scene storyboard? This replaces scenes and animations.",
              );
              if (!ok) return;
            }
            onUpdate(applyIonicCareSequence(state));
          }}
          className="order-first rounded-lg border-2 border-violet-700/70 bg-violet-950/40 px-3 py-2.5 text-left hover:bg-violet-950/60 sm:col-span-2"
        >
          <p className="text-xs font-semibold text-violet-100">★ Ionic Care sequence (recommended)</p>
          <p className="mt-0.5 text-[10px] leading-snug text-zinc-400">
            3 scenes with persistent logo, product placeholders, particles, underline, and badge — no uploads required to preview.
          </p>
        </button>
        {BANNER_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => applyTemplate(template.id)}
            className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2.5 text-left transition-colors hover:border-violet-700/50 hover:bg-violet-950/20"
          >
            <p className="text-xs font-medium text-zinc-200">{template.name}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
              {template.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
