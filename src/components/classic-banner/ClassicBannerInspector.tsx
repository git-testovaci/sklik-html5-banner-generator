"use client";

import { useMemo, useState } from "react";
import { getClassicBannerRecommendations } from "@/lib/classic-banner/classic-banner-recommendations";
import {
  classicBannerImageSourceKind,
  clearClassicBannerAsset,
  getClassicImageUrl,
  uploadClassicBannerAsset,
  type ClassicBannerImageSlot,
} from "@/lib/classic-banner/classic-banner-image-sources";
import {
  isClassicBannerSlotVisible,
  patchClassicBannerContent,
  patchClassicBannerDesignTokens,
  prepareClassicBannerData,
  setClassicBannerSlotVisible,
} from "@/lib/classic-banner/classic-banner-update";
import { formatFileSize } from "@/lib/assets/image-utils";
import type { BannerAsset } from "@/types/assets";
import type {
  ClassicBannerDesignTokens,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicBannerSlotId,
} from "@/types/classic-banner";
import { ClassicBannerWarnings } from "./ClassicBannerWarnings";

interface ClassicBannerInspectorProps {
  data: ClassicBannerProjectData;
  projectId: string;
  assets: BannerAsset[];
  selectedVariant?: ClassicBannerSizeVariant;
  onChange: (next: ClassicBannerProjectData) => void;
  onAssetsChange: (assets: BannerAsset[]) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{children}</h3>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  multiline = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const className =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
      )}
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-900"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-100"
        />
      </div>
    </div>
  );
}

function SlotToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-zinc-800/60 px-3 py-2 text-sm text-zinc-300">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-violet-600"
      />
    </label>
  );
}

const SLOT_TOGGLE_LABELS: Record<ClassicBannerSlotId, string> = {
  background: "Pozadí",
  logo: "Logo",
  headline: "Nadpis",
  slogan: "Slogan",
  hero: "Hero obrázek",
  cta: "Výzva k akci",
  badge: "Štítek",
  decoration: "Dekorace",
};

const IMAGE_SLOT_LABELS: Record<ClassicBannerImageSlot, string> = {
  background: "Pozadí",
  logo: "Logo",
  hero: "Hero obrázek",
};

const IMAGE_URL_FIELD: Record<ClassicBannerImageSlot, "backgroundUrl" | "logoUrl" | "heroImageUrl"> = {
  background: "backgroundUrl",
  logo: "logoUrl",
  hero: "heroImageUrl",
};

function ClassicImageSlotField({
  slot,
  label,
  url,
  sourceKind,
  asset,
  uploadError,
  uploading,
  onUrlChange,
  onUpload,
  onClearLocal,
}: {
  slot: ClassicBannerImageSlot;
  label: string;
  url: string;
  sourceKind: ReturnType<typeof classicBannerImageSourceKind>;
  asset?: BannerAsset;
  uploadError?: string;
  uploading: boolean;
  onUrlChange: (value: string) => void;
  onUpload: (file: File) => void;
  onClearLocal: () => void;
}) {
  const inputId = `classic-upload-${slot}`;

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-300">{label}</p>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {sourceKind === "local" ? "Používá se nahraný soubor" : "Používá se URL"}
        </span>
      </div>

      <TextField
        id={`classic-${slot}-url`}
        label="URL"
        value={url}
        onChange={onUrlChange}
      />

      <div className="mt-3">
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-zinc-300">
          Nahrát obrázek
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
          disabled={uploading}
          className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-violet-600 file:px-2 file:py-1 file:text-xs file:text-white"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = "";
          }}
        />
        {uploading ? <p className="mt-1 text-xs text-zinc-500">Nahrávání…</p> : null}
        {uploadError ? (
          <p className="mt-1 text-xs text-red-400" role="alert">
            {uploadError}
          </p>
        ) : null}
        {asset ? (
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-400">
            <span className="truncate">
              {asset.fileName} · {asset.width}×{asset.height} · {formatFileSize(asset.size)}
            </span>
            <button
              type="button"
              onClick={onClearLocal}
              className="shrink-0 text-red-400 hover:text-red-300"
            >
              Odebrat nahraný soubor
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ClassicBannerInspector({
  data,
  projectId,
  assets,
  selectedVariant,
  onChange,
  onAssetsChange,
}: ClassicBannerInspectorProps) {
  const { content, designTokens } = data;
  const [uploadingSlot, setUploadingSlot] = useState<ClassicBannerImageSlot | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Partial<Record<ClassicBannerImageSlot, string>>>(
    {},
  );
  const recommendations = useMemo(
    () => getClassicBannerRecommendations(data, selectedVariant),
    [data, selectedVariant],
  );

  function emit(next: ClassicBannerProjectData) {
    onChange(prepareClassicBannerData(next));
  }

  function updateContent(patch: Partial<typeof content>) {
    emit(patchClassicBannerContent(data, patch));
  }

  function updateTokens(patch: Partial<ClassicBannerDesignTokens>) {
    emit(patchClassicBannerDesignTokens(data, patch));
  }

  function toggleSlot(slotId: ClassicBannerSlotId, enabled: boolean) {
    emit(setClassicBannerSlotVisible(data, slotId, enabled));
  }

  async function handleUpload(slot: ClassicBannerImageSlot, file: File) {
    setUploadErrors((prev) => ({ ...prev, [slot]: "" }));
    setUploadingSlot(slot);
    try {
      const result = await uploadClassicBannerAsset(file, projectId, slot, assets, content);
      if (!result.ok) {
        setUploadErrors((prev) => ({ ...prev, [slot]: result.message }));
        return;
      }
      onAssetsChange(result.assets);
      emit(patchClassicBannerContent(data, result.contentPatch));
    } finally {
      setUploadingSlot(null);
    }
  }

  async function handleClearLocal(slot: ClassicBannerImageSlot) {
    const result = await clearClassicBannerAsset(slot, assets, content);
    onAssetsChange(result.assets);
    emit(patchClassicBannerContent(data, result.contentPatch));
  }

  function assetForSlot(slot: ClassicBannerImageSlot): BannerAsset | undefined {
    const assetId =
      slot === "background"
        ? content.backgroundAssetId
        : slot === "logo"
          ? content.logoAssetId
          : content.heroAssetId;
    return assetId ? assets.find((item) => item.id === assetId) : undefined;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Inspector</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Obsah a vzhled banneru</p>
      </div>

      <div className="space-y-6 p-4">
        {recommendations.length > 0 ? (
          <section>
            <SectionTitle>Doporučení</SectionTitle>
            <ClassicBannerWarnings recommendations={recommendations} className="mt-2" />
          </section>
        ) : null}

        <section className="space-y-3">
          <SectionTitle>Obrázky</SectionTitle>
          {(["background", "logo", "hero"] as const).map((slot) => (
            <ClassicImageSlotField
              key={slot}
              slot={slot}
              label={IMAGE_SLOT_LABELS[slot]}
              url={getClassicImageUrl(content, slot)}
              sourceKind={classicBannerImageSourceKind(content, slot)}
              asset={assetForSlot(slot)}
              uploading={uploadingSlot === slot}
              uploadError={uploadErrors[slot]}
              onUrlChange={(value) => updateContent({ [IMAGE_URL_FIELD[slot]]: value })}
              onUpload={(file) => void handleUpload(slot, file)}
              onClearLocal={() => void handleClearLocal(slot)}
            />
          ))}
        </section>

        <section className="space-y-3">
          <SectionTitle>Vrstvy</SectionTitle>
          {(["logo", "hero", "slogan", "badge"] as const).map((slotId) => (
            <SlotToggle
              key={slotId}
              label={SLOT_TOGGLE_LABELS[slotId]}
              checked={isClassicBannerSlotVisible(data, slotId)}
              onChange={(enabled) => toggleSlot(slotId, enabled)}
            />
          ))}
        </section>

        <section className="space-y-3">
          <SectionTitle>Texty</SectionTitle>
          <TextField
            id="classic-headline"
            label="Nadpis"
            value={content.headline}
            onChange={(headline) => updateContent({ headline })}
            multiline
          />
          <TextField
            id="classic-slogan"
            label="Slogan"
            value={content.slogan}
            onChange={(slogan) => updateContent({ slogan })}
          />
          <TextField
            id="classic-cta"
            label="Výzva k akci"
            value={content.ctaText}
            onChange={(ctaText) => updateContent({ ctaText })}
          />
          <TextField
            id="classic-badge"
            label="Text štítku"
            value={content.badgeText}
            onChange={(badgeText) => updateContent({ badgeText })}
          />
        </section>

        <section className="space-y-3">
          <SectionTitle>Logo a typografie</SectionTitle>
          <div>
            <label
              htmlFor="classic-logo-position"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Pozice loga
            </label>
            <select
              id="classic-logo-position"
              value={designTokens.logoPositionPreset}
              onChange={(e) =>
                updateTokens({
                  logoPositionPreset: e.target.value as ClassicBannerDesignTokens["logoPositionPreset"],
                })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="top-left">Vlevo nahoře</option>
              <option value="top-center">Uprostřed nahoře</option>
              <option value="top-right">Vpravo nahoře</option>
            </select>
          </div>
          <TextField
            id="classic-font-family"
            label="Rodina písma"
            value={designTokens.fontFamily}
            onChange={(fontFamily) => updateTokens({ fontFamily })}
          />
        </section>

        <section className="space-y-3">
          <SectionTitle>Barvy</SectionTitle>
          <ColorField
            id="classic-primary"
            label="Primární / pozadí"
            value={designTokens.primaryColor}
            onChange={(primaryColor) => updateTokens({ primaryColor })}
          />
          <ColorField
            id="classic-accent"
            label="Akcent"
            value={designTokens.accentColor}
            onChange={(accentColor) => updateTokens({ accentColor })}
          />
          <ColorField
            id="classic-text"
            label="Text"
            value={designTokens.textColor}
            onChange={(textColor) => updateTokens({ textColor })}
          />
          <ColorField
            id="classic-cta-bg"
            label="CTA pozadí"
            value={designTokens.ctaBackgroundColor}
            onChange={(ctaBackgroundColor) => updateTokens({ ctaBackgroundColor })}
          />
          <ColorField
            id="classic-cta-text"
            label="CTA text"
            value={designTokens.ctaTextColor}
            onChange={(ctaTextColor) => updateTokens({ ctaTextColor })}
          />
          <ColorField
            id="classic-badge-bg"
            label="Štítek pozadí"
            value={designTokens.badgeBackgroundColor}
            onChange={(badgeBackgroundColor) => updateTokens({ badgeBackgroundColor })}
          />
          <ColorField
            id="classic-badge-text"
            label="Štítek text"
            value={designTokens.badgeTextColor}
            onChange={(badgeTextColor) => updateTokens({ badgeTextColor })}
          />
        </section>
      </div>
    </div>
  );
}
