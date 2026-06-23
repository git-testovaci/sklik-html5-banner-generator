import type { BannerAssetPlacement, TextLayerPlacement } from "./assets";
import type { BannerTimeline, LayerAnimation } from "./animation";

export type BannerTemplateId =
  | "product-hero"
  | "logo-cta"
  | "big-headline"
  | "split-layout"
  | "minimal-brand"
  | "square-social"
  | "wide-leaderboard";

export interface BannerTemplate {
  id: BannerTemplateId;
  name: string;
  description: string;
  textPlacements: (width: number, height: number) => TextLayerPlacement[];
  assetPlacementsForKind: (
    kind: BannerAssetPlacement["kind"],
    assetId: string,
    width: number,
    height: number,
  ) => BannerAssetPlacement;
  layerAnimations: LayerAnimation[];
  timeline: BannerTimeline;
}
