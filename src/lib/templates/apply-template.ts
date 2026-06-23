import type { BannerEditorState } from "@/types/editor";
import type { BannerTemplateId } from "@/types/templates";
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

  return {
    ...state,
    textPlacements: template.textPlacements(width, height),
    assetPlacements,
    layerAnimations: template.layerAnimations.map((a) => ({ ...a })),
    timeline: { ...template.timeline },
  };
}
