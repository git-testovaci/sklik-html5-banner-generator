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
          Reposition layers and animations. Keeps uploaded assets and banner size.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
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
          className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2.5 text-left hover:bg-violet-950/50 sm:col-span-2"
        >
          <p className="text-xs font-medium text-violet-200">Ionic Care sequence</p>
          <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
            3-scene storyboard: headline, product, particles, underline, badge flip, loop.
          </p>
        </button>
      </div>
    </section>
  );
}
