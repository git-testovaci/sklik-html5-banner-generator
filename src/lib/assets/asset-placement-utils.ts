import type { BannerAssetKind } from "@/types/assets";
import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState, SelectedLayer } from "@/types/editor";
import {
  emptyEditorSelection,
  selectionForBannerLayer,
} from "@/lib/animation/selection-utils";
import { getLayerById } from "@/lib/animation/storyboard-utils";
import {
  addMediaLayerAtPlayhead,
  applyLayerTimingAtPlayhead,
  assignAssetToSlotLayer,
  isSelectedEmptySlot,
  isSlotEmpty,
  resolveLayerFromSelection,
  slotAcceptsAssetKind,
} from "@/lib/assets/slot-utils";

export type MediaPlacementKind = "timeline" | "template-place" | "library-only";

export interface MediaPlacementResult {
  nextState: BannerEditorState;
  layerId: string | null;
  selection: SelectedLayer;
  message: string;
  placementKind: MediaPlacementKind;
  applied: boolean;
}

export interface TimelinePlacementParams {
  assetId: string;
  playheadLocalMs: number;
}

export interface TemplatePlaceFillParams {
  assetId: string;
  playheadLocalMs: number;
  layerId?: string;
  selection?: SelectedLayer | null;
}

export interface PlaceAssetTargetParams {
  assetId: string;
  playheadLocalMs: number;
  selection?: SelectedLayer | null;
}

export interface UploadedAssetPlacementParams {
  assetId: string;
  kind: BannerAssetKind;
  playheadLocalMs: number;
  selection?: SelectedLayer | null;
}

/** Selected empty template placeholder/místo, if any. */
export function resolveSelectedTemplatePlace(
  state: BannerEditorState,
  selection: SelectedLayer | null | undefined,
): BannerLayer | undefined {
  if (!isSelectedEmptySlot(state, selection)) return undefined;
  return resolveLayerFromSelection(state, selection);
}

export function canFillSelectedTemplatePlace(
  state: BannerEditorState,
  assetId: string,
  selection: SelectedLayer | null | undefined,
): boolean {
  const slot = resolveSelectedTemplatePlace(state, selection);
  if (!slot) return false;
  const asset = (state.assets ?? []).find((a) => a.id === assetId);
  if (!asset) return false;
  return slotAcceptsAssetKind(slot, asset.kind);
}

/** Create a new media layer on the timeline at the scene-local playhead. */
export function createMediaLayerInstance(
  state: BannerEditorState,
  params: TimelinePlacementParams,
): MediaPlacementResult {
  const { state: nextState, layer } = addMediaLayerAtPlayhead(
    state,
    params.assetId,
    params.playheadLocalMs,
  );
  return {
    nextState,
    layerId: layer.id,
    selection: selectionForBannerLayer(layer),
    message: `${layer.name} přidán na časovou osu`,
    placementKind: "timeline",
    applied: true,
  };
}

/** Alias for timeline insertion from media library UI. */
export function addAssetToTimeline(
  state: BannerEditorState,
  params: TimelinePlacementParams,
): MediaPlacementResult {
  return createMediaLayerInstance(state, params);
}

/** Fill a selected template placeholder/místo without changing layer id. */
export function fillSelectedTemplatePlace(
  state: BannerEditorState,
  params: TemplatePlaceFillParams,
): MediaPlacementResult | null {
  const targetLayerId =
    params.layerId ??
    resolveSelectedTemplatePlace(state, params.selection ?? null)?.id;
  if (!targetLayerId) return null;

  const slot = getLayerById(state, targetLayerId);
  if (!slot || !isSlotEmpty(slot)) return null;
  if (!slot.isTemplateSlot && !slot.slotKind) return null;

  let nextState = assignAssetToSlotLayer(state, targetLayerId, params.assetId);
  nextState = applyLayerTimingAtPlayhead(
    nextState,
    targetLayerId,
    params.playheadLocalMs,
  );
  const updated = getLayerById(nextState, targetLayerId);
  if (!updated) return null;

  return {
    nextState,
    layerId: targetLayerId,
    selection: selectionForBannerLayer(updated),
    message: `${slot.name} — vloženo do vybraného místa`,
    placementKind: "template-place",
    applied: true,
  };
}

/** Fill selected placeholder when possible; otherwise leave state unchanged. */
export function placeAssetInSelectedTarget(
  state: BannerEditorState,
  params: PlaceAssetTargetParams,
): MediaPlacementResult {
  if (canFillSelectedTemplatePlace(state, params.assetId, params.selection)) {
    const filled = fillSelectedTemplatePlace(state, {
      assetId: params.assetId,
      selection: params.selection,
      playheadLocalMs: params.playheadLocalMs,
    });
    if (filled) return filled;
  }

  return {
    nextState: state,
    layerId: null,
    selection: params.selection ?? emptyEditorSelection(),
    message: "Soubor nahrán do Média — klikněte + Přidat na časovou osu.",
    placementKind: "library-only",
    applied: false,
  };
}

/** After upload, optionally auto-fill selected compatible placeholder. */
export function placeUploadedAssetInStoryboard(
  state: BannerEditorState,
  params: UploadedAssetPlacementParams,
): MediaPlacementResult {
  const slot = resolveSelectedTemplatePlace(state, params.selection);
  if (slot && slotAcceptsAssetKind(slot, params.kind)) {
    const filled = fillSelectedTemplatePlace(state, {
      assetId: params.assetId,
      layerId: slot.id,
      playheadLocalMs: params.playheadLocalMs,
    });
    if (filled) {
      return {
        ...filled,
        message: "Soubor vložen do vybraného místa",
      };
    }
  }

  return {
    nextState: state,
    layerId: null,
    selection: params.selection ?? emptyEditorSelection(),
    message: "Soubor nahrán do Média — klikněte + Přidat na časovou osu.",
    placementKind: "library-only",
    applied: false,
  };
}
