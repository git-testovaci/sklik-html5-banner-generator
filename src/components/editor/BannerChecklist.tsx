"use client";

import type { BannerEditorState } from "@/types/editor";
import { getTemplateSlotLayers, hasFilledSlot, isSlotEmpty } from "@/lib/assets/slot-utils";
import { getValidationSummary } from "@/lib/validation-rules";

export type ChecklistAction =
  | "templates"
  | "logo-slot"
  | "product-slot"
  | "text"
  | "timing"
  | "export";

interface BannerChecklistProps {
  state: BannerEditorState;
  hasTemplate: boolean;
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

export function BannerChecklist({ state, hasTemplate, onAction }: BannerChecklistProps) {
  const slots = getTemplateSlotLayers(state);
  const hasLogoSlot = slots.some((s) => s.slotKind === "logo");
  const hasProductSlot = slots.some((s) => s.slotKind === "product" || s.slotKind === "image");
  const logoDone = hasLogoSlot ? hasFilledSlot(state, "logo") : (state.assets ?? []).some((a) => a.kind === "logo");
  const productDone = hasProductSlot
    ? slots.some((s) => (s.slotKind === "product" || s.slotKind === "image") && !isSlotEmpty(s))
    : (state.assets ?? []).some((a) => a.kind === "product");
  const textEdited =
    state.headline !== "Váš nadpis zde" &&
    state.headline.length > 0 &&
    !state.headline.toLowerCase().includes("headline here");
  const hasEffects = (state.layerEffects ?? []).length > 0 || (state.scenes ?? []).length > 1;
  const validation = getValidationSummary(state);

  const items: Item[] = [
    {
      id: "templates",
      label: "Šablona",
      status: hasTemplate ? "done" : "warn",
      hint: hasTemplate ? "Storyboard aktivní" : "Vyberte šablonu",
    },
    {
      id: "logo-slot",
      label: "Logo",
      status: logoDone ? "done" : hasLogoSlot ? "warn" : "missing",
      hint: logoDone ? "Logo v banneru" : "Nahrát logo",
    },
    {
      id: "product-slot",
      label: "Produkt / obrázek",
      status: productDone ? "done" : hasProductSlot ? "warn" : "missing",
      hint: productDone ? "Obrázek v banneru" : "Nahrát produkt",
    },
    {
      id: "text",
      label: "Text upraven",
      status: textEdited ? "done" : "warn",
      hint: textEdited ? "Copy vypadá hotově" : "Upravte nadpis",
    },
    {
      id: "timing",
      label: "Animace",
      status: hasEffects ? "done" : "missing",
      hint: hasEffects ? "Motion připraven" : "Zkontrolovat časování",
    },
    {
      id: "export",
      label: "Export",
      status: validation.exportReady ? "done" : "warn",
      hint: validation.exportReady ? "Připraveno k exportu" : "Zkontrolovat upozornění",
    },
  ];

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        Kontrolní seznam
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
              <span className="text-[9px] text-zinc-600">Zkontrolovat</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
