export { applyIonicCareSequence, applyStoryboardTemplate } from "./storyboard-templates";
export type { StoryboardTemplateId } from "@/types/storyboard-templates";
export {
  STORYBOARD_TEMPLATES,
  STORYBOARD_TEMPLATE_CATEGORIES,
  getStoryboardTemplate,
} from "./storyboard-templates";

import type { BannerEditorState } from "@/types/editor";
import type { BannerTemplateId } from "@/types/templates";
import { normalizeEditorState } from "@/lib/animation/timeline-utils";
import { getTemplateById } from "./banner-templates";

export function applyTemplateToState(
  state: BannerEditorState,
  templateId: BannerTemplateId,
): BannerEditorState {
  const template = getTemplateById(templateId);
  if (!template) return state;

  const { width, height } = state;
  const assets = state.assets ?? [];

  const assetPlacements = (state.assetPlacements ?? []).map((placement) => {
    const asset = assets.find((a) => a.id === placement.assetId);
    if (!asset) return placement;
    return template.assetPlacementsForKind(asset.kind, asset.id, width, height);
  });

  for (const asset of assets) {
    if (!assetPlacements.some((p) => p.assetId === asset.id)) {
      assetPlacements.push(
        template.assetPlacementsForKind(asset.kind, asset.id, width, height),
      );
    }
  }

  return normalizeEditorState({
    ...state,
    textPlacements: template.textPlacements(width, height),
    assetPlacements,
    layerAnimations: template.layerAnimations.map((a) => ({ ...a })),
    timeline: { ...template.timeline },
    scenes: undefined,
    bannerLayers: undefined,
    layerEffects: undefined,
    activeSceneId: undefined,
  });
}
