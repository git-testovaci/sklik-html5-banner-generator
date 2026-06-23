import type { BannerAsset, BannerAssetPlacement, TextLayerPlacement } from "./assets";
import type { BannerTimeline, LayerAnimation } from "./animation";
import type { ProjectStatus } from "./project";

export type BannerAnimation = "none" | "fade-in" | "slide-up" | "soft-pulse";

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

export type BannerEditorStateUpdater = (
  patch: Partial<BannerEditorState>,
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
