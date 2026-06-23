"use client";

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
  getActiveScene,
  getLayerById,
  getSceneById,
  updateBannerLayer,
  updateLayerEffect,
  updateScene,
} from "@/lib/animation/storyboard-utils";
import { EffectPresetPicker } from "./EffectPresetPicker";
import { ParticleLayerControls } from "./ParticleLayerControls";
import { TextEffectControls } from "./TextEffectControls";

interface InspectorPanelProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  selection: EditorSelection;
  onSelectEffect: (effectId: string) => void;
}

export function InspectorPanel({
  state,
  onUpdate,
  selection,
  onSelectEffect,
}: InspectorPanelProps) {
  if (selection.type === "scene") {
    const scene = getSceneById(state, selection.sceneId);
    if (!scene) return <EmptyInspector message="Scene not found" />;
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
        <Header title="Scéna" subtitle={scene.name} />
        <div className="space-y-3 p-4">
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
          <Field label="Přechod na další scénu">
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
      </section>
    );
  }

  if (selection.type === "effect") {
    const effect = (state.layerEffects ?? []).find((e) => e.id === selection.effectId);
    if (!effect) return <EmptyInspector message="Effect not found" />;
    const layer = getLayerById(state, effect.layerId);
    const scene = getSceneById(state, effect.sceneId);
    const friendly = describeLayerEffect(state, effect);
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
        <Header title="Animace" subtitle={friendly} />
        <div className="space-y-3 p-4">
          <p className="text-[11px] text-zinc-500">
            Vrstva: <span className="text-zinc-300">{layerDisplayName(layer)}</span>
            {scene ? (
              <>
                {" "}
                · Scéna: <span className="text-zinc-300">{scene.name}</span>
              </>
            ) : null}
          </p>
          <p className="text-[11px] text-zinc-500">
            Efekt: <span className="text-zinc-300">{effectFriendlyLabel(effect.preset)}</span>
          </p>
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
          <Field label="Intenzita">
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.1}
              value={effect.intensity}
              onChange={(e) =>
                onUpdate(
                  updateLayerEffect(state, effect.id, { intensity: Number(e.target.value) }),
                )
              }
              className="w-full"
            />
          </Field>
          <button
            type="button"
            onClick={() => onSelectEffect(effect.id)}
            className="text-[10px] text-violet-400 hover:underline"
          >
            Zaměřit v časové ose
          </button>
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

  const layer = layerId ? getLayerById(state, layerId) : undefined;

  if (!layer) {
    const active = getActiveScene(state);
    if (active) {
        return (
        <EmptyInspector message="Select a layer on the canvas or timeline to edit its properties." />
      );
    }
    return <EmptyInspector message="No layer selected" />;
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <Header
        title={layer.type.charAt(0).toUpperCase() + layer.type.slice(1)}
        subtitle={layer.name}
      />
      <div className="space-y-3 p-4">
        {layer.type === "text" ? (
          <TextEffectControls layer={layer} state={state} onUpdate={onUpdate} />
        ) : null}
        {layer.type === "particle" ? (
          <ParticleLayerControls layer={layer} state={state} onUpdate={onUpdate} />
        ) : null}
        {(layer.type === "image" || layer.type === "badge") && (
          <ImageInspector layer={layer} state={state} onUpdate={onUpdate} />
        )}
        {layer.type === "underline" && (
          <UnderlineInspector layer={layer} state={state} onUpdate={onUpdate} />
        )}
        <CommonLayerFields layer={layer} state={state} onUpdate={onUpdate} />
      </div>
    </section>
  );
}

function ImageInspector({
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
    <>
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
      <Field label="Border radius">
        <input
          type="number"
          min={0}
          value={layer.borderRadius ?? 0}
          onChange={(e) => patch({ borderRadius: Number(e.target.value) })}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        />
      </Field>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={layer.shadow ?? false}
          onChange={(e) => patch({ shadow: e.target.checked })}
        />
        Drop shadow
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={layer.persistent}
          onChange={(e) => patch({ persistent: e.target.checked })}
        />
        Persist across all scenes (persistent layer)
      </label>
    </>
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
    <>
      <Field label="Color">
        <input
          type="color"
          value={layer.underlineColor ?? state.accentColor}
          onChange={(e) => patch({ underlineColor: e.target.value })}
          className="h-8 w-full rounded border border-zinc-700"
        />
      </Field>
      <Field label="Thickness">
        <input
          type="number"
          min={1}
          max={12}
          value={layer.thickness ?? 3}
          onChange={(e) => patch({ thickness: Number(e.target.value) })}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        />
      </Field>
      <Field label="Draw duration (ms)">
        <input
          type="number"
          min={100}
          value={layer.drawDurationMs ?? 600}
          onChange={(e) => patch({ drawDurationMs: Number(e.target.value) })}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        />
      </Field>
    </>
  );
}

function CommonLayerFields({
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
    <div className="grid grid-cols-2 gap-2 border-t border-zinc-800/60 pt-3">
      {(["x", "y", "width", "height", "opacity", "rotation"] as const).map((key) => (
        <Field key={key} label={key}>
          <input
            type="number"
            step={key === "opacity" ? 0.1 : 1}
            value={layer[key] as number}
            onChange={(e) => patch({ [key]: Number(e.target.value) })}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          />
        </Field>
      ))}
    </div>
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
      <p className="mt-3 text-[10px] text-zinc-600">
        Tip: click a layer on the canvas, a scene card, or an effect bar in the timeline.
      </p>
    </section>
  );
}
