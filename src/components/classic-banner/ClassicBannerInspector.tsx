"use client";

import {
  isClassicBannerSlotVisible,
  patchClassicBannerContent,
  patchClassicBannerDesignTokens,
  setClassicBannerSlotVisible,
} from "@/lib/classic-banner/classic-banner-update";
import type {
  ClassicBannerDesignTokens,
  ClassicBannerProjectData,
} from "@/types/classic-banner";

interface ClassicBannerInspectorProps {
  data: ClassicBannerProjectData;
  onChange: (next: ClassicBannerProjectData) => void;
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

export function ClassicBannerInspector({ data, onChange }: ClassicBannerInspectorProps) {
  const { content, designTokens } = data;
  const badgeEnabled = isClassicBannerSlotVisible(data, "badge");

  function updateContent(patch: Partial<typeof content>) {
    onChange(patchClassicBannerContent(data, patch));
  }

  function updateTokens(patch: Partial<ClassicBannerDesignTokens>) {
    onChange(patchClassicBannerDesignTokens(data, patch));
  }

  function toggleBadge(enabled: boolean) {
    onChange(setClassicBannerSlotVisible(data, "badge", enabled));
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Inspector</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Obsah a vzhled banneru</p>
      </div>

      <div className="space-y-6 p-4">
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
          <label className="flex items-center justify-between rounded-lg border border-zinc-800/60 px-3 py-2 text-sm text-zinc-300">
            <span>Zobrazit štítek</span>
            <input
              type="checkbox"
              checked={badgeEnabled}
              onChange={(e) => toggleBadge(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-violet-600"
            />
          </label>
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
