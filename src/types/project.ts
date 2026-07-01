import type { ClassicBannerProjectData } from "./classic-banner";
import type { BannerAsset, BannerAssetPlacement, TextLayerPlacement } from "./assets";
import type {
  BannerLayer,
  BannerScene,
  BannerTimeline,
  LayerAnimation,
  LayerEffect,
  LayerKeyframe,
} from "./animation";
import type { BannerAnimation } from "./editor";

export type ProjectStatus = "draft" | "shared" | "exported";

export type ProjectKind = "html5-banner" | "classic-banner";

export interface BannerProject {
  id: string;
  name: string;
  status: ProjectStatus;
  /** Omitted on legacy projects — treated as html5-banner when loading. */
  projectKind?: ProjectKind;
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
  animation: BannerAnimation;
  logoLabel: string;
  productImageLabel: string;
  shareId: string;
  createdAt: string;
  updatedAt: string;
  assets?: BannerAsset[];
  assetPlacements?: BannerAssetPlacement[];
  textPlacements?: TextLayerPlacement[];
  timeline?: BannerTimeline;
  layerAnimations?: LayerAnimation[];
  scenes?: BannerScene[];
  bannerLayers?: BannerLayer[];
  layerEffects?: LayerEffect[];
  layerKeyframes?: LayerKeyframe[];
  activeSceneId?: string;
  /** Classic static banner payload — present when projectKind is classic-banner. */
  classicBanner?: ClassicBannerProjectData;
}

export interface DashboardStats {
  total: number;
  drafts: number;
  shared: number;
  exported: number;
}
