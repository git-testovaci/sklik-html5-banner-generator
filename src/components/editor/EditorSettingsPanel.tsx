import type { BannerEditorStateUpdater } from "@/types/editor";
import type { BannerEditorState } from "@/types/editor";
import { ColorField } from "./ColorField";
import { SizeSelect } from "./SizeSelect";
import { TextField } from "./TextField";

interface EditorSettingsPanelProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}

export function EditorSettingsPanel({ state, onUpdate }: EditorSettingsPanelProps) {
  return (
    <aside
      aria-labelledby="settings-heading"
      className="w-full min-w-0 shrink-0 overflow-y-auto rounded-xl border border-zinc-800/80 bg-zinc-900/40 lg:w-[280px]"
    >
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 id="settings-heading" className="text-sm font-medium text-zinc-300">
          Banner settings
        </h2>
      </div>

      <div className="space-y-4 p-4">
        <TextField
          id="project-name"
          label="Project name"
          value={state.name}
          onChange={(name) => onUpdate({ name })}
        />

        <SizeSelect
          id="banner-size"
          width={state.width}
          height={state.height}
          onChange={(width, height) => onUpdate({ width, height })}
        />

        <TextField
          id="headline"
          label="Headline"
          value={state.headline}
          onChange={(headline) => onUpdate({ headline })}
        />

        <TextField
          id="subheadline"
          label="Subheadline"
          value={state.subheadline}
          onChange={(subheadline) => onUpdate({ subheadline })}
        />

        <TextField
          id="cta"
          label="CTA text"
          value={state.cta}
          onChange={(cta) => onUpdate({ cta })}
        />

        <div className="border-t border-zinc-800/60 pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Colors
          </p>
          <div className="space-y-4">
            <ColorField
              id="bg-color"
              label="Background"
              value={state.backgroundColor}
              onChange={(backgroundColor) => onUpdate({ backgroundColor })}
            />
            <ColorField
              id="text-color"
              label="Text"
              value={state.textColor}
              onChange={(textColor) => onUpdate({ textColor })}
            />
            <ColorField
              id="cta-bg-color"
              label="CTA background"
              value={state.ctaBackgroundColor}
              onChange={(ctaBackgroundColor) => onUpdate({ ctaBackgroundColor })}
            />
            <ColorField
              id="cta-text-color"
              label="CTA text"
              value={state.ctaTextColor}
              onChange={(ctaTextColor) => onUpdate({ ctaTextColor })}
            />
            <ColorField
              id="accent-color"
              label="Accent"
              value={state.accentColor}
              onChange={(accentColor) => onUpdate({ accentColor })}
            />
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          Per-layer animations are configured in the timeline below.
        </p>

        <TextField
          id="logo-label"
          label="Logo label"
          value={state.logoLabel}
          onChange={(logoLabel) => onUpdate({ logoLabel })}
          placeholder="Placeholder text for logo area"
        />

        <TextField
          id="product-image-label"
          label="Product image label"
          value={state.productImageLabel}
          onChange={(productImageLabel) => onUpdate({ productImageLabel })}
          placeholder="Placeholder text for product image"
        />
      </div>
    </aside>
  );
}
