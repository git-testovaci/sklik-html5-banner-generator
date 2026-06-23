export type BannerAssetKind = "logo" | "product" | "background" | "decoration";

export interface BannerAsset {
  id: string;
  projectId: string;
  kind: BannerAssetKind;
  fileName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  createdAt: string;
}

export type AssetFitMode = "contain" | "cover" | "fill";

export type TextAlign = "left" | "center" | "right";

export interface BannerAssetPlacement {
  assetId: string;
  kind: BannerAssetKind;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  zIndex: number;
  fit: AssetFitMode;
  borderRadius: number;
  shadow: boolean;
}

export interface TextLayerPlacement {
  layerId: "headline" | "subheadline" | "cta";
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  zIndex: number;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: TextAlign;
  lineHeight?: number;
}

export interface AssetUploadResult {
  ok: true;
  asset: BannerAsset;
  warning?: string;
}

export interface AssetUploadError {
  ok: false;
  message: string;
}

export type AssetUploadOutcome = AssetUploadResult | AssetUploadError;

export interface AssetValidationResult {
  valid: boolean;
  message: string;
  warnings: string[];
}
