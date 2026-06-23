"use client";

import type { BannerLayer } from "@/types/animation";

interface SlotPlaceholderProps {
  layer: BannerLayer;
  accentColor: string;
  interactive?: boolean;
  publicMode?: boolean;
  onActivate?: () => void;
}

export function SlotPlaceholder({
  layer,
  accentColor,
  interactive = false,
  publicMode = false,
  onActivate,
}: SlotPlaceholderProps) {
  const label = layer.slotLabel ?? layer.name;
  const kind = layer.slotKind ?? layer.legacyKey ?? "image";
  const isLogo = kind === "logo";
  const isProduct = kind === "product" || kind === "image";
  const isBackground = kind === "background";

  const gradient = isBackground
    ? `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}08 100%)`
    : isProduct
      ? `linear-gradient(160deg, ${accentColor}18 0%, #ffffff08 50%, ${accentColor}10 100%)`
      : `linear-gradient(135deg, ${accentColor}15 0%, #ffffff06 100%)`;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onActivate?.();
      }}
      className={`flex h-full w-full flex-col items-center justify-center gap-1.5 border-2 border-dashed p-2 text-center transition-colors ${
        interactive ? "cursor-pointer hover:border-violet-400/80 hover:bg-violet-950/20" : "cursor-default"
      }`}
      style={{
        borderColor: `${accentColor}66`,
        borderRadius: layer.shapeType === "circle" ? "9999px" : layer.borderRadius ?? 10,
        background: gradient,
        boxShadow: layer.shadow ? "0 4px 16px rgba(0,0,0,0.15)" : undefined,
      }}
    >
      <span
        className="text-lg leading-none opacity-70"
        aria-hidden
      >
        {isLogo ? "◆" : isProduct ? "▢" : isBackground ? "▤" : "●"}
      </span>
      <span className="text-[11px] font-semibold" style={{ color: accentColor }}>
        {label}
      </span>
      {interactive && !publicMode ? (
        <span className="text-[9px] text-zinc-400">Klikněte pro nahrání</span>
      ) : null}
    </button>
  );
}
