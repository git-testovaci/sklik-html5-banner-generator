"use client";

import type { BannerEditorState } from "@/types/editor";
import {
  hasAnimations,
  hasMediaInLibrary,
  hasMediaOnTimeline,
  hasStoryboardTemplate,
  textsLookEdited,
  transitionsConfigured,
} from "@/lib/editor/checklist-utils";
import { getValidationSummary } from "@/lib/validation-rules";

export type ChecklistAction =
  | "templates"
  | "media"
  | "timeline"
  | "layers"
  | "transitions"
  | "timing"
  | "export";

interface BannerChecklistProps {
  state: BannerEditorState;
  onAction: (action: ChecklistAction) => void;
}

type Status = "done" | "warn" | "missing";

interface Item {
  id: ChecklistAction;
  label: string;
  status: Status;
  hint: string;
}

function statusIcon(status: Status): string {
  if (status === "done") return "✓";
  if (status === "warn") return "!";
  return "○";
}

function statusClass(status: Status): string {
  if (status === "done") return "text-emerald-400";
  if (status === "warn") return "text-amber-400";
  return "text-zinc-500";
}

export function BannerChecklist({ state, onAction }: BannerChecklistProps) {
  const validation = getValidationSummary(state);

  const items: Item[] = [
    {
      id: "templates",
      label: "Šablona",
      status: hasStoryboardTemplate(state) ? "done" : "warn",
      hint: hasStoryboardTemplate(state) ? "Vybráno" : "Vyberte šablonu",
    },
    {
      id: "media",
      label: "Média",
      status: hasMediaInLibrary(state) ? "done" : "warn",
      hint: hasMediaInLibrary(state)
        ? `${(state.assets ?? []).length} souborů v knihovně`
        : "Nahrajte média",
    },
    {
      id: "timeline",
      label: "Časová osa",
      status: hasMediaOnTimeline(state) ? "done" : hasMediaInLibrary(state) ? "warn" : "missing",
      hint: hasMediaOnTimeline(state) ? "Média na ose" : "Přidejte média na osu",
    },
    {
      id: "layers",
      label: "Texty",
      status: textsLookEdited(state) ? "done" : "warn",
      hint: textsLookEdited(state) ? "Upraveno" : "Vyberte a upravte vrstvu",
    },
    {
      id: "timing",
      label: "Animace",
      status: hasAnimations(state) ? "done" : "warn",
      hint: hasAnimations(state) ? "Nastaveno" : "Nastavte animace",
    },
    {
      id: "export",
      label: "Export ZIP",
      status: validation.exportReady ? "done" : "warn",
      hint: validation.exportReady ? "Připraveno k exportu" : "Vyžaduje kontrolu",
    },
  ];

  if ((state.scenes ?? []).length > 1) {
    items.splice(5, 0, {
      id: "transitions",
      label: "Přechody",
      status: transitionsConfigured(state) ? "done" : "missing",
      hint: transitionsConfigured(state) ? "OK" : "Volitelné u více scén",
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        Kontrola před exportem
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onAction(item.id)}
              className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-zinc-800/40"
            >
              <span className={`w-4 text-xs font-bold ${statusClass(item.status)}`}>
                {statusIcon(item.status)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-zinc-300">{item.label}</span>
                <span className="block truncate text-[9px] text-zinc-600">{item.hint}</span>
              </span>
              <span className="text-[9px] text-zinc-700">→</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
