"use client";

import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import { layerDisplayName } from "@/lib/animation/effect-labels";
import {
  getActiveScene,
  patchBannerLayerSlice,
  removeLayerFromEditor,
  reorderLayerInScene,
} from "@/lib/animation/storyboard-utils";
import { isSlotEmpty } from "@/lib/assets/slot-utils";
import { LayerPhaseAnimationControls } from "./LayerPhaseAnimationControls";

interface LayerInspectorControlsProps {
  layer: BannerLayer;
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  onOpenAssets?: () => void;
  onLayerRemoved?: () => void;
}

function layerTypeLabelCs(layer: BannerLayer): string {
  if (layer.type === "text") {
    if (layer.legacyKey === "headline") return "Text · Nadpis";
    if (layer.legacyKey === "subheadline") return "Text · Podnadpis";
    if (layer.legacyKey === "cta") return "Text · Výzva k akci";
    return "Text";
  }
  if (layer.legacyKey === "logo" || layer.slotKind === "logo") return "Logo";
  if (layer.legacyKey === "product" || layer.slotKind === "product") return "Produkt";
  if (layer.legacyKey === "background" || layer.slotKind === "background") return "Pozadí";
  if (layer.type === "badge") return "Odznak";
  if (layer.type === "image") return "Obrázek";
  if (layer.type === "particle") return "Částice";
  if (layer.type === "underline") return "Podtržení";
  if (layer.type === "shape") return "Tvar";
  return "Vrstva";
}

function isImageLikeLayer(layer: BannerLayer): boolean {
  if (isCtaLikeLayer(layer) && !layer.assetId) return false;
  return (
    layer.type === "image" ||
    layer.type === "badge" ||
    layer.legacyKey === "logo" ||
    layer.legacyKey === "product" ||
    layer.legacyKey === "background" ||
    !!layer.slotKind
  );
}

function isCtaLikeLayer(layer: BannerLayer): boolean {
  return layer.legacyKey === "cta" || (layer.type === "badge" && !!layer.text);
}

function isTemplateProtectedLayer(layer: BannerLayer): boolean {
  return (
    !!layer.isTemplateSlot ||
    !!layer.slotKind ||
    layer.legacyKey === "headline" ||
    layer.legacyKey === "subheadline" ||
    layer.legacyKey === "cta"
  );
}

export function LayerInspectorControls({
  layer,
  state,
  onUpdate,
  onOpenAssets,
  onLayerRemoved,
}: LayerInspectorControlsProps) {
  const scene = getActiveScene(state);
  const asset = layer.assetId
    ? (state.assets ?? []).find((a) => a.id === layer.assetId)
    : undefined;

  function patch(p: Partial<BannerLayer>) {
    onUpdate(patchBannerLayerSlice(state, layer.id, p));
  }

  function reorder(action: "forward" | "backward" | "front" | "back") {
    if (!scene) return;
    onUpdate(reorderLayerInScene(state, scene.id, layer.id, action));
  }

  function handleDelete() {
    const next = removeLayerFromEditor(state, layer.id);
    onUpdate(next);
    const stillExists = (next.bannerLayers ?? []).some((l) => l.id === layer.id);
    if (!stillExists) {
      onLayerRemoved?.();
    }
  }

  const deleteLabel =
    (layer.isTemplateSlot || layer.slotKind) && layer.assetId
      ? "Vymazat obsah slotu"
      : isTemplateProtectedLayer(layer)
        ? "Skrýt vrstvu"
        : "Smazat vrstvu";

  const emptySlot = isImageLikeLayer(layer) && isSlotEmpty(layer);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-3 py-2.5">
        <Field label="Název vrstvy">
          <input
            type="text"
            value={layer.name}
            onChange={(e) => patch({ name: e.target.value })}
            className={inputClass}
          />
        </Field>
        <p className="mt-1.5 text-[11px] font-medium text-zinc-300">{layerDisplayName(layer)}</p>
        <p className="text-[10px] text-zinc-500">{layerTypeLabelCs(layer)}</p>
      </div>

      <Section title="Pozice a vzhled">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pozice X">
            <input
              type="number"
              value={Math.round(layer.x)}
              onChange={(e) => patch({ x: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Pozice Y">
            <input
              type="number"
              value={Math.round(layer.y)}
              onChange={(e) => patch({ y: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Velikost Š">
            <input
              type="number"
              min={1}
              value={Math.round(layer.width)}
              onChange={(e) => patch({ width: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Velikost V">
            <input
              type="number"
              min={1}
              value={Math.round(layer.height)}
              onChange={(e) => patch({ height: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Rotace">
            <input
              type="number"
              value={layer.rotation}
              onChange={(e) => patch({ rotation: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Průhlednost">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={layer.opacity}
              onChange={(e) => patch({ opacity: Number(e.target.value) })}
              className="mt-1 w-full accent-violet-500"
            />
            <span className="text-[10px] text-zinc-500">{Math.round(layer.opacity * 100)} %</span>
          </Field>
        </div>
        <label className="flex items-center justify-between rounded border border-zinc-800/60 px-2 py-1.5 text-[11px] text-zinc-300">
          <span>{layer.visible ? "Viditelné" : "Skryté"}</span>
          <input
            type="checkbox"
            checked={layer.visible}
            onChange={(e) => patch({ visible: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between rounded border border-zinc-800/60 px-2 py-1.5 text-[11px] text-zinc-300">
          <span>{layer.locked ? "Zamknout" : "Odemknout"}</span>
          <input
            type="checkbox"
            checked={layer.locked}
            onChange={(e) => patch({ locked: e.target.checked })}
          />
        </label>
      </Section>

      {scene ? (
        <Section title="Pořadí">
          <div className="grid grid-cols-2 gap-1">
            <SmallButton onClick={() => reorder("forward")}>Posunout dopředu</SmallButton>
            <SmallButton onClick={() => reorder("backward")}>Posunout dozadu</SmallButton>
            <SmallButton onClick={() => reorder("front")}>Do popředí</SmallButton>
            <SmallButton onClick={() => reorder("back")}>Do pozadí</SmallButton>
          </div>
        </Section>
      ) : null}

      {layer.type === "text" && layer.legacyKey !== "cta" ? (
        <Section title="Obsah · text">
          <Field label="Text">
            <textarea
              value={layer.text ?? ""}
              onChange={(e) => patch({ text: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Velikost písma">
              <input
                type="number"
                min={6}
                value={layer.fontSize ?? 14}
                onChange={(e) => patch({ fontSize: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Tučné">
              <select
                value={layer.fontWeight ?? 400}
                onChange={(e) => patch({ fontWeight: Number(e.target.value) })}
                className={inputClass}
              >
                <option value={400}>Normální</option>
                <option value={600}>Tučné</option>
                <option value={700}>Extra tučné</option>
              </select>
            </Field>
          </div>
          <Field label="Barva textu">
            <input
              type="color"
              value={layer.color ?? (layer.legacyKey === "cta" ? state.ctaTextColor : state.textColor)}
              onChange={(e) => patch({ color: e.target.value })}
              className="h-8 w-full cursor-pointer rounded border border-zinc-700"
            />
          </Field>
          <Field label="Zarovnání">
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => patch({ textAlign: align })}
                  className={`flex-1 rounded border px-2 py-1 text-[10px] ${
                    (layer.textAlign ?? "left") === align
                      ? "border-violet-600/60 bg-violet-950/40 text-violet-200"
                      : "border-zinc-700 text-zinc-400 hover:bg-zinc-800/40"
                  }`}
                >
                  {align === "left" ? "Vlevo" : align === "center" ? "Na střed" : "Vpravo"}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Řádkování">
              <input
                type="number"
                min={0.8}
                max={3}
                step={0.05}
                value={layer.lineHeight ?? 1.25}
                onChange={(e) => patch({ lineHeight: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Rozestup písmen">
              <input
                type="number"
                step={0.5}
                value={layer.letterSpacing ?? 0}
                onChange={(e) => patch({ letterSpacing: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>
      ) : null}

      {isImageLikeLayer(layer) ? (
        <Section title="Obsah · obrázek">
          {asset ? (
            <Field label="Soubor média">
              <p className="truncate text-xs text-zinc-300" title={asset.fileName}>
                {asset.fileName}
              </p>
            </Field>
          ) : emptySlot ? (
            <p className="text-[10px] text-zinc-500">Slot je prázdný</p>
          ) : null}
          {emptySlot && onOpenAssets ? (
            <div className="flex flex-wrap gap-1">
              <SmallButton onClick={onOpenAssets}>Nahrát obrázek</SmallButton>
              <SmallButton onClick={onOpenAssets}>Vybrat z knihovny</SmallButton>
            </div>
          ) : null}
          <Field label="Způsob vyplnění">
            <select
              value={layer.fit ?? "contain"}
              onChange={(e) => patch({ fit: e.target.value as BannerLayer["fit"] })}
              className={inputClass}
            >
              <option value="contain">Zachovat celý</option>
              <option value="cover">Vyplnit plochu</option>
              <option value="fill">Roztáhnout</option>
            </select>
          </Field>
          <Field label="Zaoblení rohů">
            <input
              type="number"
              min={0}
              max={999}
              value={layer.borderRadius ?? 0}
              onChange={(e) => patch({ borderRadius: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
        </Section>
      ) : null}

      {isCtaLikeLayer(layer) ? (
        <Section title="Obsah · tlačítko">
          <Field label="CTA text">
            <input
              type="text"
              value={layer.text ?? state.cta}
              onChange={(e) => patch({ text: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Barva pozadí">
            <input
              type="color"
              value={layer.fill ?? state.ctaBackgroundColor}
              onChange={(e) => patch({ fill: e.target.value })}
              className="h-8 w-full cursor-pointer rounded border border-zinc-700"
            />
          </Field>
          <Field label="Barva textu">
            <input
              type="color"
              value={layer.color ?? state.ctaTextColor}
              onChange={(e) => patch({ color: e.target.value })}
              className="h-8 w-full cursor-pointer rounded border border-zinc-700"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Zaoblení rohů">
              <input
                type="number"
                min={0}
                value={layer.borderRadius ?? 4}
                onChange={(e) => patch({ borderRadius: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Odsazení">
              <input
                type="number"
                min={0}
                value={layer.paddingX ?? 10}
                onChange={(e) => patch({ paddingX: Number(e.target.value), paddingY: layer.paddingY ?? 4 })}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>
      ) : null}

      <LayerPhaseAnimationControls layer={layer} state={state} onUpdate={onUpdate} />

      <div className="border-t border-zinc-800/60 pt-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
          Nebezpečná akce
        </p>
        <button
          type="button"
          onClick={handleDelete}
          className="w-full rounded border border-red-900/50 px-2.5 py-1.5 text-[10px] font-medium text-red-400 hover:bg-red-950/30"
        >
          {deleteLabel}
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-800/60 pt-3 first:border-t-0 first:pt-0">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[10px] text-zinc-500">
      {label}
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

function SmallButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800/50"
    >
      {children}
    </button>
  );
}
