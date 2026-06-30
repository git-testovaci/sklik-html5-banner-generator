"use client";

import type { BannerLayer } from "@/types/animation";
import type {
  BannerEditorState,
  BannerEditorStateUpdater,
  EditorSelection,
} from "@/types/editor";
import {
  describeLayerEffect,
  effectFriendlyLabel,
  layerDisplayName,
} from "@/lib/animation/effect-labels";
import { resolveBannerLayerForSelection } from "@/lib/animation/selection-utils";
import {
  getActiveScene,
  getLayerById,
  getSceneById,
  updateBannerLayer,
  updateLayerEffect,
} from "@/lib/animation/storyboard-utils";
import { EffectPresetPicker } from "./EffectPresetPicker";
import { ParticleLayerControls } from "./ParticleLayerControls";
import { LayerInspectorControls } from "./LayerInspectorControls";
import { TransitionInspectorControls } from "./TransitionInspectorControls";

interface InspectorPanelProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  selection: EditorSelection;
  onSelectEffect: (effectId: string) => void;
  onOpenAssets?: () => void;
  onPreviewTransition?: () => void;
  onLayerRemoved?: () => void;
}

export function InspectorPanel({
  state,
  onUpdate,
  selection,
  onSelectEffect,
  onOpenAssets,
  onPreviewTransition,
  onLayerRemoved,
}: InspectorPanelProps) {
  if (selection.type === "scene") {
    const scene = getSceneById(state, selection.sceneId);
    if (!scene) return <EmptyInspector message="Scéna nenalezena" />;
    return (
      <TransitionInspectorControls
        state={state}
        scene={scene}
        onUpdate={onUpdate}
        onPreviewTransition={onPreviewTransition}
      />
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
          <p className="text-xs text-zinc-400">
            {effectFriendlyLabel(effect.preset)} · {layerDisplayName(layer)}
            {scene ? ` · ${scene.name}` : ""}
          </p>
          <ActionButton onClick={() => onSelectEffect(effect.id)}>
            Upravit v časové ose
          </ActionButton>
          <details className="border-t border-zinc-800/60 pt-3">
            <summary className="cursor-pointer text-xs text-zinc-500">Více nastavení</summary>
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
                <Field label="Začátek">
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
                <Field label="Délka">
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

  const layer =
    selection.type === "layer"
      ? getLayerById(state, selection.layerId)
      : selection.type === "text" || selection.type === "asset"
        ? resolveBannerLayerForSelection(state, selection)
        : undefined;

  if (!layer) {
    const active = getActiveScene(state);
    if (active) {
      return (
        <EmptyInspector message="Vyberte vrstvu na plátně nebo v časové ose." />
      );
    }
    return <EmptyInspector message="Vyberte vrstvu pro zobrazení nastavení." />;
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <Header
        title="Vrstva"
        subtitle={layerDisplayName(layer)}
      />
      <div className="space-y-2 p-4">
        <LayerInspectorControls
          layer={layer}
          state={state}
          onUpdate={onUpdate}
          onOpenAssets={onOpenAssets}
          onLayerRemoved={onLayerRemoved}
        />
        {layer.type === "particle" ? (
          <ParticleLayerControls layer={layer} state={state} onUpdate={onUpdate} />
        ) : null}
        {layer.type === "underline" ? (
          <UnderlineInspector layer={layer} state={state} onUpdate={onUpdate} />
        ) : null}
      </div>
    </section>
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
      <summary className="cursor-pointer text-xs text-zinc-500">Podtržení</summary>
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
      className={`rounded border px-2.5 py-1.5 text-xs font-medium ${
        variant === "danger"
          ? "border-red-900/50 text-red-400 hover:bg-red-950/30"
          : "border-violet-800/50 bg-violet-950/20 text-violet-200 hover:bg-violet-950/40"
      }`}
    >
      {children}
    </button>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-zinc-800/60 px-4 py-3">
      <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
      {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function EmptyInspector({ message }: { message: string }) {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-8 text-center">
      <h2 className="text-sm font-medium text-zinc-400">Vlastnosti</h2>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{message}</p>
    </section>
  );
}
