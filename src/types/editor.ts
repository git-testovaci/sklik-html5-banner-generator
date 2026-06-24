import type { BannerAsset, BannerAssetPlacement, TextLayerPlacement } from "./assets";
import type {
  BannerLayer,
  BannerScene,
  BannerTimeline,
  LayerAnimation,
  LayerEffect,
  LayerKeyframe,
} from "./animation";
import type { ProjectStatus } from "./project";

export type BannerAnimation = "none" | "fade-in" | "slide-up" | "soft-pulse";

export type SelectedLayer =
  | { type: "text"; id: "headline" | "subheadline" | "cta" }
  | { type: "asset"; id: string };

export type EditorSelection =
  | { type: "layer"; layerId: string }
  | { type: "scene"; sceneId: string }
  | { type: "effect"; effectId: string }
  | SelectedLayer;

export interface BannerEditorState {
  projectId: string;
  name: string;
  status: ProjectStatus;
  width: number;
  height: number;
  headline: string;
  subheadline: string;
  cta: string;
  backgroundColor: string;
  textColor: string;
  ctaBackgroundColor: string;
  ctaTextColor: string;
  accentColor: string;
  /** @deprecated Legacy single animation — timeline layerAnimations preferred */
  animation: BannerAnimation;
  logoLabel: string;
  productImageLabel: string;
  shareId: string;
  assets?: BannerAsset[];
  assetPlacements?: BannerAssetPlacement[];
  textPlacements?: TextLayerPlacement[];
  timeline?: BannerTimeline;
  layerAnimations?: LayerAnimation[];
  /** Storyboard model */
  scenes?: BannerScene[];
  bannerLayers?: BannerLayer[];
  layerEffects?: LayerEffect[];
  layerKeyframes?: LayerKeyframe[];
  activeSceneId?: string;
}

export const BANNER_ANIMATIONS: readonly {
  value: BannerAnimation;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "fade-in", label: "Fade in" },
  { value: "slide-up", label: "Slide up" },
  { value: "soft-pulse", label: "Soft pulse" },
] as const;

export type EditorHistoryMode = "push" | "replace" | "skip";

export type BannerEditorStateUpdater = (
  patch: Partial<BannerEditorState>,
  options?: { history?: EditorHistoryMode },
) => void;

export function serializeEditorState(state: BannerEditorState): string {
  return JSON.stringify(state);
}

export function editorStatesEqual(
  a: BannerEditorState,
  b: BannerEditorState,
): boolean {
  return serializeEditorState(a) === serializeEditorState(b);
}

export function selectionToLayerId(sel: EditorSelection): string | null {
  if (sel.type === "layer") return sel.layerId;
  if (sel.type === "text") return sel.id;
  if (sel.type === "asset") return sel.id;
  return null;
}
