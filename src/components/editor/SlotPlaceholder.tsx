"use client";

import type { MouseEvent } from "react";
import type { BannerLayer } from "@/types/animation";

interface SlotPlaceholderProps {
  layer: BannerLayer;
  accentColor: string;
  interactive?: boolean;
  publicMode?: boolean;
  missingAsset?: boolean;
  onActivate?: () => void;
}

export function SlotPlaceholder({
  layer,
  accentColor,
  interactive = false,
  publicMode = false,
  missingAsset = false,
  onActivate,
}: SlotPlaceholderProps) {
  const kind = layer.slotKind ?? layer.legacyKey ?? "image";
  const isLogo = kind === "logo";
  const isProduct = kind === "product" || kind === "image";
  const isBackground = kind === "background";
  const isBadge = kind === "badge";

  const editorLabel = isLogo
    ? "Nahrát logo"
    : isProduct
      ? "Nahrát produkt"
      : isBackground
        ? "Nahrát pozadí"
        : isBadge
          ? "Přidat obrázek"
          : friendlySlotLabel(layer.slotLabel, "Přidat obrázek");

  const showTemplateHint = !publicMode && (layer.isTemplateSlot || layer.slotKind);

  const gradient = isBackground
    ? `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}06 50%, #ffffff04 100%)`
    : isProduct
      ? `linear-gradient(160deg, ${accentColor}14 0%, #ffffff06 45%, ${accentColor}08 100%)`
      : isLogo
        ? `linear-gradient(180deg, #ffffff08 0%, ${accentColor}10 100%)`
        : `linear-gradient(135deg, ${accentColor}12 0%, #ffffff05 100%)`;

  const borderRadius =
    layer.shapeType === "circle" ? "9999px" : layer.borderRadius ?? (isLogo ? 6 : isProduct ? 12 : 10);

  const Wrapper = interactive ? "button" : "div";

  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      disabled={interactive ? false : undefined}
      onClick={(e: MouseEvent) => {
        if (!interactive) return;
        e.stopPropagation();
        onActivate?.();
      }}
      className={`flex h-full w-full flex-col items-center justify-center gap-1 border border-dashed p-2 text-center ${
        interactive ? "cursor-pointer hover:border-violet-400/70 hover:bg-violet-950/15" : "cursor-default"
      }`}
      style={{
        borderColor: `${accentColor}44`,
        borderRadius,
        background: gradient,
        boxShadow: layer.shadow ? "inset 0 0 0 1px rgba(255,255,255,0.04)" : undefined,
        opacity: layer.opacity,
      }}
    >
      <span className="text-base leading-none opacity-50" aria-hidden>
        {isLogo ? "◆" : isProduct ? "▢" : isBackground ? "▤" : isBadge ? "●" : "▢"}
      </span>
      {!publicMode ? (
        <>
          <span className="text-[10px] font-semibold leading-tight" style={{ color: `${accentColor}cc` }}>
            {missingAsset ? "Chybí soubor" : editorLabel}
          </span>
          {showTemplateHint && !missingAsset ? (
            <span className="text-[9px] text-zinc-500">Místo ve šabloně</span>
          ) : null}
          {interactive && !missingAsset ? (
            <span className="text-[9px] text-zinc-500">Klikněte nebo vyberte z Média</span>
          ) : null}
        </>
      ) : (
        <span
          className="block h-2 w-2/3 rounded-full opacity-30"
          style={{ background: `${accentColor}55` }}
          aria-hidden
        />
      )}
    </Wrapper>
  );
}

function friendlySlotLabel(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower.includes("slot")) {
    if (lower.includes("logo")) return "Nahrát logo";
    if (lower.includes("produkt") || lower.includes("product")) return "Nahrát produkt";
    if (lower.includes("pozad")) return "Nahrát pozadí";
    return fallback;
  }
  return raw;
}
