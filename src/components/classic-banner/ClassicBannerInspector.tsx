"use client";

import { useMemo, useState } from "react";
import { getClassicBannerRecommendations } from "@/lib/classic-banner/classic-banner-recommendations";
import {
  classicBannerImageSourceKind,
  clearClassicBannerAsset,
  getClassicBannerImageUrlExportWarnings,
  getClassicImageUrl,
  importClassicBannerImageFromUrl,
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
  ClassicBannerEditorChangeOptions,
  ClassicBannerOnChange,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicBannerSlotId,
  ClassicEditableSlotId,
} from "@/types/classic-banner";
import { ClassicBannerWarnings } from "./ClassicBannerWarnings";
import { ClassicLayerInspector } from "./ClassicLayerInspector";
import { ClassicPropagationPanel } from "./ClassicPropagationPanel";

interface ClassicBannerInspectorProps {
  data: ClassicBannerProjectData;
  projectId: string;
  assets: BannerAsset[];
  selectedVariant?: ClassicBannerSizeVariant;
  selectedSlotId?: ClassicEditableSlotId | null;
  onChange: ClassicBannerOnChange;
  onCombinedChange: (
    classicBanner: ClassicBannerProjectData,
    assets: BannerAsset[],
    options?: ClassicBannerEditorChangeOptions,
  ) => void;
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
  importError,
  importSuccess,
  uploading,
  importing,
  onUrlChange,
  onUpload,
  onImportUrl,
  onClearLocal,
}: {
  slot: ClassicBannerImageSlot;
  label: string;
  url: string;
  sourceKind: ReturnType<typeof classicBannerImageSourceKind>;
  asset?: BannerAsset;
  uploadError?: string;
  importError?: string;
  importSuccess?: string;
  uploading: boolean;
  importing: boolean;
  onUrlChange: (value: string) => void;
  onUpload: (file: File) => void;
  onImportUrl: () => void;
  onClearLocal: () => void;
}) {
  const inputId = `classic-upload-${slot}`;
  const canImportUrl = url.trim().length > 0 && sourceKind !== "local";
  const busy = uploading || importing;

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

      <div className="mt-2">
        <button
          type="button"
          disabled={!canImportUrl || busy}
          onClick={onImportUrl}
          className="rounded border border-violet-700/70 bg-violet-950/40 px-2.5 py-1.5 text-xs font-medium text-violet-200 transition-colors hover:border-violet-600 hover:bg-violet-900/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {importing ? "Stahuji…" : "Stáhnout do projektu"}
        </button>
        {importing ? <p className="mt-1 text-xs text-zinc-500">Stahuji…</p> : null}
        {importSuccess ? (
          <p className="mt-1 text-xs text-emerald-400" role="status">
            {importSuccess}
          </p>
        ) : null}
        {importError ? (
          <p className="mt-1 text-xs text-red-400" role="alert">
            {importError}
          </p>
        ) : null}
      </div>

      <div className="mt-3">
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-zinc-300">
          Nahrát obrázek
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
          disabled={busy}
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
  selectedSlotId = null,
  onChange,
  onCombinedChange,
}: ClassicBannerInspectorProps) {
  const { content, designTokens } = data;
  const [uploadingSlot, setUploadingSlot] = useState<ClassicBannerImageSlot | null>(null);
  const [importingSlot, setImportingSlot] = useState<ClassicBannerImageSlot | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Partial<Record<ClassicBannerImageSlot, string>>>(
    {},
  );
  const [importErrors, setImportErrors] = useState<Partial<Record<ClassicBannerImageSlot, string>>>(
    {},
  );
  const [importSuccess, setImportSuccess] = useState<
    Partial<Record<ClassicBannerImageSlot, string>>
  >({});
  const recommendations = useMemo(() => {
    const layoutRecommendations = getClassicBannerRecommendations(data, selectedVariant);
    const urlWarnings = getClassicBannerImageUrlExportWarnings(content).map((item) => ({
      id: item.id,
      severity: item.severity,
      message: item.message,
    }));
    const merged = [...layoutRecommendations];
    for (const warning of urlWarnings) {
      if (!merged.some((item) => item.id === warning.id)) {
        merged.push(warning);
      }
    }
    return merged;
  }, [content, data, selectedVariant]);

  function emit(next: ClassicBannerProjectData, options?: ClassicBannerEditorChangeOptions) {
    onChange(prepareClassicBannerData(next), options);
  }

  function updateContent(
    patch: Partial<typeof content>,
    options?: ClassicBannerEditorChangeOptions,
  ) {
    emit(patchClassicBannerContent(data, patch), options);
  }

  function updateTokens(
    patch: Partial<ClassicBannerDesignTokens>,
    options?: ClassicBannerEditorChangeOptions,
  ) {
    emit(patchClassicBannerDesignTokens(data, patch), options);
  }

  function toggleSlot(slotId: ClassicBannerSlotId, enabled: boolean) {
    emit(setClassicBannerSlotVisible(data, slotId, enabled), { history: "push" });
  }

  async function handleImportUrl(slot: ClassicBannerImageSlot) {
    const url = getClassicImageUrl(content, slot);
    setImportErrors((prev) => ({ ...prev, [slot]: "" }));
    setImportSuccess((prev) => ({ ...prev, [slot]: "" }));
    setImportingSlot(slot);
    try {
      const result = await importClassicBannerImageFromUrl(
        url,
        projectId,
        slot,
        assets,
        content,
      );
      if (!result.ok) {
        setImportErrors((prev) => ({ ...prev, [slot]: result.message }));
        return;
      }
      onCombinedChange(
        patchClassicBannerContent(data, result.contentPatch),
        result.assets,
        { history: "push" },
      );
      setImportSuccess((prev) => ({
        ...prev,
        [slot]: "Obrázek uložen lokálně. Export bude spolehlivější.",
      }));
    } finally {
      setImportingSlot(null);
    }
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
      onCombinedChange(
        patchClassicBannerContent(data, result.contentPatch),
        result.assets,
        { history: "push" },
      );
    } finally {
      setUploadingSlot(null);
    }
  }

  async function handleClearLocal(slot: ClassicBannerImageSlot) {
    const result = await clearClassicBannerAsset(slot, assets, content);
    onCombinedChange(
      patchClassicBannerContent(data, result.contentPatch),
      result.assets,
      { history: "push" },
    );
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
    <div className="flex flex-col">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Inspector</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Vlastnosti vybrané vrstvy, obsah a vzhled</p>
      </div>

      {selectedVariant ? (
        <>
          <ClassicLayerInspector
            data={data}
            variant={selectedVariant}
            selectedSlotId={selectedSlotId}
            assets={assets}
            onChange={onChange}
          />
          <ClassicPropagationPanel
            data={data}
            variant={selectedVariant}
            selectedSlotId={selectedSlotId}
            onChange={onChange}
          />
        </>
      ) : null}

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
              importing={importingSlot === slot}
              uploadError={uploadErrors[slot]}
              importError={importErrors[slot]}
              importSuccess={importSuccess[slot]}
              onUrlChange={(value) => {
                setImportSuccess((prev) => ({ ...prev, [slot]: "" }));
                updateContent({ [IMAGE_URL_FIELD[slot]]: value }, { history: "replace" });
              }}
              onUpload={(file) => void handleUpload(slot, file)}
              onImportUrl={() => void handleImportUrl(slot)}
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
            onChange={(headline) => updateContent({ headline }, { history: "replace" })}
            multiline
          />
          <TextField
            id="classic-slogan"
            label="Slogan"
            value={content.slogan}
            onChange={(slogan) => updateContent({ slogan }, { history: "replace" })}
          />
          <TextField
            id="classic-cta"
            label="Výzva k akci"
            value={content.ctaText}
            onChange={(ctaText) => updateContent({ ctaText }, { history: "replace" })}
          />
          <TextField
            id="classic-badge"
            label="Text štítku"
            value={content.badgeText}
            onChange={(badgeText) => updateContent({ badgeText }, { history: "replace" })}
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
                updateTokens(
                  {
                    logoPositionPreset: e.target.value as ClassicBannerDesignTokens["logoPositionPreset"],
                  },
                  { history: "push" },
                )
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
            onChange={(fontFamily) => updateTokens({ fontFamily }, { history: "replace" })}
          />
        </section>

        <section className="space-y-3">
          <SectionTitle>Barvy</SectionTitle>
          <ColorField
            id="classic-primary"
            label="Primární / pozadí"
            value={designTokens.primaryColor}
            onChange={(primaryColor) => updateTokens({ primaryColor }, { history: "replace" })}
          />
          <ColorField
            id="classic-accent"
            label="Akcent"
            value={designTokens.accentColor}
            onChange={(accentColor) => updateTokens({ accentColor }, { history: "replace" })}
          />
          <ColorField
            id="classic-text"
            label="Text"
            value={designTokens.textColor}
            onChange={(textColor) => updateTokens({ textColor }, { history: "replace" })}
          />
          <ColorField
            id="classic-cta-bg"
            label="CTA pozadí"
            value={designTokens.ctaBackgroundColor}
            onChange={(ctaBackgroundColor) => updateTokens({ ctaBackgroundColor }, { history: "replace" })}
          />
          <ColorField
            id="classic-cta-text"
            label="CTA text"
            value={designTokens.ctaTextColor}
            onChange={(ctaTextColor) => updateTokens({ ctaTextColor }, { history: "replace" })}
          />
          <ColorField
            id="classic-badge-bg"
            label="Štítek pozadí"
            value={designTokens.badgeBackgroundColor}
            onChange={(badgeBackgroundColor) => updateTokens({ badgeBackgroundColor }, { history: "replace" })}
          />
          <ColorField
            id="classic-badge-text"
            label="Štítek text"
            value={designTokens.badgeTextColor}
            onChange={(badgeTextColor) => updateTokens({ badgeTextColor }, { history: "replace" })}
          />
        </section>
      </div>
    </div>
  );
}
