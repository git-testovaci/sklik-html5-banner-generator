"use client";

import { useState } from "react";
import type { BannerLayer } from "@/types/animation";
import { SCENE_TRANSITIONS } from "@/types/animation";
import type {
  BannerEditorState,
  BannerEditorStateUpdater,
  EditorSelection,
} from "@/types/editor";
import {
  describeLayerEffect,
  effectFriendlyLabel,
  layerDisplayName,
  transitionFriendlyLabel,
} from "@/lib/animation/effect-labels";
import {
  applyTransitionToAllScenes,
  deleteBannerLayer,
  getActiveScene,
  getLayerById,
  getSceneById,
  getSceneTransitionDurationMs,
  updateBannerLayer,
  updateLayerEffect,
  updateScene,
} from "@/lib/animation/storyboard-utils";
import { isSlotEmpty, clearSlotAsset } from "@/lib/assets/slot-utils";
import {
  centerHorizontally,
  centerVertically,
  fitBackgroundPlacement,
} from "@/lib/animation/timeline-utils";
import { EffectPresetPicker } from "./EffectPresetPicker";
import { ParticleLayerControls } from "./ParticleLayerControls";
import { TextEffectControls } from "./TextEffectControls";

interface InspectorPanelProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  selection: EditorSelection;
  onSelectEffect: (effectId: string) => void;
  onOpenAssets?: () => void;
  onPreviewTransition?: () => void;
}

export function InspectorPanel({
  state,
  onUpdate,
  selection,
  onSelectEffect,
  onOpenAssets,
  onPreviewTransition,
}: InspectorPanelProps) {
  if (selection.type === "scene") {
    const scene = getSceneById(state, selection.sceneId);
    if (!scene) return <EmptyInspector message="Scéna nenalezena" />;
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
        <Header title="Přechod scény" subtitle={scene.name} />
        <div className="space-y-3 p-4">
          <ActionButton onClick={onPreviewTransition}>Náhled přechodu</ActionButton>
          <Field label="Typ přechodu">
            <select
              value={scene.transitionOut}
              onChange={(e) =>
                onUpdate(
                  updateScene(state, scene.id, {
                    transitionOut: e.target.value as typeof scene.transitionOut,
                  }),
                )
              }
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
            >
              {SCENE_TRANSITIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {transitionFriendlyLabel(t.value)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Délka přechodu (ms)">
            <input
              type="number"
              min={400}
              max={1200}
              step={50}
              value={getSceneTransitionDurationMs(scene)}
              onChange={(e) =>
                onUpdate(
                  updateScene(state, scene.id, { transitionDurationMs: Number(e.target.value) }),
                )
              }
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
            />
          </Field>
          <ActionButton
            onClick={() =>
              onUpdate(
                applyTransitionToAllScenes(state, scene.transitionOut, scene.transitionDurationMs),
              )
            }
          >
            Použít přechod na všechny scény
          </ActionButton>
          <details className="border-t border-zinc-800/60 pt-3">
            <summary className="cursor-pointer text-[10px] text-zinc-500">Detailní nastavení scény</summary>
            <div className="mt-3 space-y-3">
              <Field label="Název">
                <input
                  type="text"
                  value={scene.name}
                  onChange={(e) =>
                    onUpdate(updateScene(state, scene.id, { name: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                />
              </Field>
              <Field label="Délka scény (ms)">
                <input
                  type="number"
                  min={500}
                  max={8000}
                  value={scene.durationMs}
                  onChange={(e) =>
                    onUpdate(
                      updateScene(state, scene.id, { durationMs: Number(e.target.value) }),
                    )
                  }
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                />
              </Field>
              <Field label="Pozadí scény">
                <input
                  type="color"
                  value={scene.backgroundColor ?? state.backgroundColor}
                  onChange={(e) =>
                    onUpdate(updateScene(state, scene.id, { backgroundColor: e.target.value }))
                  }
                  className="h-8 w-full cursor-pointer rounded border border-zinc-700"
                />
              </Field>
            </div>
          </details>
        </div>
      </section>
    );
  }

  if (selection.type === "effect") {
    const effect = (state.layerEffects ?? []).find((e) => e.id === selection.effectId);
    if (!effect) return <EmptyInspector message="Animace nenalezena" />;
    const layer = getLayerById(state, effect.layerId);
    const scene = getSceneById(state, effect.sceneId);
    const friendly = describeLayerEffect(state, effect);
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
        <Header title="Animace" subtitle={friendly} />
        <div className="space-y-3 p-4">
          <p className="text-[11px] text-zinc-400">
            {effectFriendlyLabel(effect.preset)} · vrstva {layerDisplayName(layer)}
            {scene ? ` · scéna ${scene.name}` : ""}
          </p>
          <p className="text-[11px] text-zinc-500">
            Začátek {(effect.startMs / 1000).toFixed(1)} s · délka {(effect.durationMs / 1000).toFixed(1)} s
          </p>
          <ActionButton onClick={() => onSelectEffect(effect.id)}>
            Upravit v časové ose
          </ActionButton>
          <details className="border-t border-zinc-800/60 pt-3">
            <summary className="cursor-pointer text-[10px] text-zinc-500">Detailní časování</summary>
            <div className="mt-3 space-y-3">
              <Field label="Typ animace">
                <EffectPresetPicker
                  value={effect.preset}
                  onChange={(preset) =>
                    onUpdate(updateLayerEffect(state, effect.id, { preset }))
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Začátek (ms)">
                  <input
                    type="number"
                    value={effect.startMs}
                    onChange={(e) =>
                      onUpdate(
                        updateLayerEffect(state, effect.id, { startMs: Number(e.target.value) }),
                      )
                    }
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                  />
                </Field>
                <Field label="Délka (ms)">
                  <input
                    type="number"
                    value={effect.durationMs}
                    onChange={(e) =>
                      onUpdate(
                        updateLayerEffect(state, effect.id, {
                          durationMs: Number(e.target.value),
                        }),
                      )
                    }
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                  />
                </Field>
              </div>
            </div>
          </details>
        </div>
      </section>
    );
  }

  const layerId =
    selection.type === "layer"
      ? selection.layerId
      : selection.type === "text"
        ? selection.id
        : selection.type === "asset"
          ? selection.id
          : null;

  let layer = layerId ? getLayerById(state, layerId) : undefined;
  if (!layer && selection.type === "asset") {
    layer = (state.bannerLayers ?? []).find((l) => l.assetId === selection.id);
  }

  if (!layer) {
    const active = getActiveScene(state);
    if (active) {
      return (
        <EmptyInspector message="Vyberte vrstvu na plátně, ve storyboardu nebo v časové ose." />
      );
    }
    return <EmptyInspector message="Žádná vrstva není vybraná" />;
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <Header title={layerDisplayName(layer)} subtitle={layer.name} />
      <div className="space-y-2 p-4">
        <LayerQuickActions
          layer={layer}
          state={state}
          onUpdate={onUpdate}
          onOpenAssets={onOpenAssets}
        />
        {layer.type === "text" ? (
          <TextEffectControls layer={layer} state={state} onUpdate={onUpdate} />
        ) : null}
        {layer.type === "particle" ? (
          <ParticleLayerControls layer={layer} state={state} onUpdate={onUpdate} />
        ) : null}
        {(layer.type === "image" || layer.type === "badge") && layer.assetId ? (
          <ImageFitControls layer={layer} state={state} onUpdate={onUpdate} />
        ) : null}
        {layer.type === "underline" ? (
          <UnderlineInspector layer={layer} state={state} onUpdate={onUpdate} />
        ) : null}
        <CollapsiblePositionFields layer={layer} state={state} onUpdate={onUpdate} />
      </div>
    </section>
  );
}

function LayerQuickActions({
  layer,
  state,
  onUpdate,
  onOpenAssets,
}: {
  layer: BannerLayer;
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  onOpenAssets?: () => void;
}) {
  function patch(p: Partial<BannerLayer>) {
    onUpdate(updateBannerLayer(state, layer.id, p));
  }

  const isImageSlot =
    layer.type === "image" || layer.type === "badge" || layer.isTemplateSlot || layer.slotKind;
  const emptySlot = isImageSlot && isSlotEmpty(layer);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {emptySlot ? (
          <>
            <ActionButton onClick={onOpenAssets}>
              {layer.slotLabel ?? "Nahrát / vybrat obrázek"}
            </ActionButton>
            <ActionButton onClick={onOpenAssets}>Použít z knihovny</ActionButton>
          </>
        ) : null}
        {isImageSlot && layer.assetId ? (
          <>
            <ActionButton onClick={onOpenAssets}>Nahradit obrázek</ActionButton>
            <ActionButton onClick={() => onUpdate(clearSlotAsset(state, layer.id))}>
              Odebrat z vrstvy
            </ActionButton>
          </>
        ) : null}
        <ActionButton
          onClick={() => {
            let placement = {
              x: layer.x,
              y: layer.y,
              width: layer.width,
              height: layer.height,
            };
            placement = centerHorizontally(placement, state.width);
            placement = centerVertically(placement, state.height);
            patch({ x: placement.x, y: placement.y });
          }}
        >
          Vycentrovat
        </ActionButton>
        {layer.legacyKey === "background" || layer.slotKind === "background" ? (
          <ActionButton
            onClick={() => {
              if (!layer.assetId) return;
              const fit = fitBackgroundPlacement(layer.assetId, state.width, state.height);
              patch({ x: fit.x, y: fit.y, width: fit.width, height: fit.height });
            }}
          >
            Přizpůsobit do rámečku
          </ActionButton>
        ) : (
          <ActionButton onClick={() => patch({ fit: "contain" })}>Přizpůsobit</ActionButton>
        )}
        <ActionButton onClick={() => patch({ zIndex: layer.zIndex + 1 })}>Dopředu</ActionButton>
        <ActionButton onClick={() => patch({ zIndex: Math.max(1, layer.zIndex - 1) })}>
          Dozadu
        </ActionButton>
        {isImageSlot ? (
          <label className="flex w-full items-center gap-2 rounded border border-zinc-800/60 px-2 py-1.5 text-[10px] text-zinc-400">
            <input
              type="checkbox"
              checked={layer.persistent}
              onChange={(e) => patch({ persistent: e.target.checked })}
            />
            Nastavit jako persistentní
          </label>
        ) : null}
        <ActionButton
          variant="danger"
          onClick={() => onUpdate(deleteBannerLayer(state, layer.id))}
        >
          Smazat vrstvu
        </ActionButton>
      </div>
      {emptySlot && onOpenAssets ? (
        <p className="text-[10px] text-zinc-500">
          Vyberte nebo nahrajte obrázek v panelu Assety.
        </p>
      ) : null}
    </div>
  );
}

function ImageFitControls({
  layer,
  state,
  onUpdate,
}: {
  layer: BannerLayer;
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}) {
  function patch(p: Partial<BannerLayer>) {
    onUpdate(updateBannerLayer(state, layer.id, p));
  }
  return (
    <details className="border-t border-zinc-800/60 pt-2">
      <summary className="cursor-pointer text-[10px] text-zinc-500">Nastavení obrázku</summary>
      <div className="mt-2 space-y-2">
        <Field label="Fit">
          <select
            value={layer.fit ?? "contain"}
            onChange={(e) => patch({ fit: e.target.value as BannerLayer["fit"] })}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
            <option value="fill">Fill</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={layer.shadow ?? false}
            onChange={(e) => patch({ shadow: e.target.checked })}
          />
          Stín
        </label>
      </div>
    </details>
  );
}

function UnderlineInspector({
  layer,
  state,
  onUpdate,
}: {
  layer: BannerLayer;
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}) {
  function patch(p: Partial<BannerLayer>) {
    onUpdate(updateBannerLayer(state, layer.id, p));
  }
  return (
    <details className="border-t border-zinc-800/60 pt-2">
      <summary className="cursor-pointer text-[10px] text-zinc-500">Podtržení</summary>
      <div className="mt-2 space-y-2">
        <Field label="Barva">
          <input
            type="color"
            value={layer.underlineColor ?? state.accentColor}
            onChange={(e) => patch({ underlineColor: e.target.value })}
            className="h-8 w-full rounded border border-zinc-700"
          />
        </Field>
      </div>
    </details>
  );
}

function CollapsiblePositionFields({
  layer,
  state,
  onUpdate,
}: {
  layer: BannerLayer;
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}) {
  const [open, setOpen] = useState(false);
  function patch(p: Partial<BannerLayer>) {
    onUpdate(updateBannerLayer(state, layer.id, p));
  }
  const labels: Record<string, string> = {
    x: "X",
    y: "Y",
    width: "Šířka",
    height: "Výška",
    opacity: "Průhlednost",
    rotation: "Rotace",
  };
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer border-t border-zinc-800/60 pt-3 text-[10px] text-zinc-500">
        Detailní pozice
      </summary>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["x", "y", "width", "height", "opacity", "rotation"] as const).map((key) => (
          <Field key={key} label={labels[key] ?? key}>
            <input
              type="number"
              step={key === "opacity" ? 0.1 : 1}
              value={layer[key] as number}
              onChange={(e) => patch({ [key]: Number(e.target.value) })}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
            />
          </Field>
        ))}
        <Field label="Z-index">
          <input
            type="number"
            value={layer.zIndex}
            onChange={(e) => patch({ zIndex: Number(e.target.value) })}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          />
        </Field>
      </div>
    </details>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2.5 py-1.5 text-[10px] font-medium ${
        variant === "danger"
          ? "border-red-900/50 text-red-400 hover:bg-red-950/30"
          : "border-violet-800/50 bg-violet-950/20 text-violet-200 hover:bg-violet-950/40"
      }`}
    >
      {children}
    </button>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-zinc-800/60 px-4 py-3">
      <h2 className="text-sm font-medium text-zinc-300">Inspector · {title}</h2>
      <p className="text-[10px] text-zinc-500">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[10px] text-zinc-500">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function EmptyInspector({ message }: { message: string }) {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-8 text-center">
      <h2 className="text-sm font-medium text-zinc-400">Inspector</h2>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{message}</p>
    </section>
  );
}
