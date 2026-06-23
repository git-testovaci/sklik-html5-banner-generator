"use client";

import type { AssetFitMode } from "@/types/assets";

interface LayerControlsProps {
  label: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  zIndex: number;
  fit?: AssetFitMode;
  borderRadius?: number;
  shadow?: boolean;
  onChange: (patch: {
    visible?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    opacity?: number;
    rotation?: number;
    zIndex?: number;
    fit?: AssetFitMode;
    borderRadius?: number;
    shadow?: boolean;
  }) => void;
}

function NumInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-zinc-500">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
      />
    </label>
  );
}

export function LayerControls({
  label,
  visible,
  x,
  y,
  width,
  height,
  opacity,
  rotation,
  zIndex,
  fit,
  borderRadius,
  shadow,
  onChange,
}: LayerControlsProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium capitalize text-zinc-300">{label}</p>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => onChange({ visible: e.target.checked })}
          className="rounded border-zinc-600"
        />
        Visible
      </label>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="X" value={x} onChange={(v) => onChange({ x: v })} min={0} />
        <NumInput label="Y" value={y} onChange={(v) => onChange({ y: v })} min={0} />
        <NumInput label="Width" value={width} onChange={(v) => onChange({ width: Math.max(1, v) })} min={1} />
        <NumInput label="Height" value={height} onChange={(v) => onChange({ height: Math.max(1, v) })} min={1} />
        <NumInput label="Opacity" value={opacity} onChange={(v) => onChange({ opacity: Math.min(1, Math.max(0, v)) })} min={0} max={1} step={0.05} />
        <NumInput label="Rotation" value={rotation} onChange={(v) => onChange({ rotation: v })} />
        <NumInput label="Z-index" value={zIndex} onChange={(v) => onChange({ zIndex: v })} />
      </div>
      {fit !== undefined ? (
        <label className="block">
          <span className="mb-0.5 block text-[10px] text-zinc-500">Fit</span>
          <select
            value={fit}
            onChange={(e) => onChange({ fit: e.target.value as AssetFitMode })}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
            <option value="fill">Fill</option>
          </select>
        </label>
      ) : null}
      {borderRadius !== undefined ? (
        <NumInput label="Border radius" value={borderRadius} onChange={(v) => onChange({ borderRadius: Math.max(0, v) })} min={0} />
      ) : null}
      {shadow !== undefined ? (
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={shadow}
            onChange={(e) => onChange({ shadow: e.target.checked })}
            className="rounded border-zinc-600"
          />
          Drop shadow
        </label>
      ) : null}
    </div>
  );
}
