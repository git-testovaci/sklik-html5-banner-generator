export type TemplateAssetSlotKind = "logo" | "product" | "background" | "badge" | "image";

export interface TemplateAssetSlot {
  id: string;
  label: string;
  kind: TemplateAssetSlotKind;
  layerId: string;
  sceneId?: string;
  persistent?: boolean;
  required?: boolean;
  recommendedSize?: string;
  description?: string;
}

export interface TemplateSlotSpec {
  kind: TemplateAssetSlotKind;
  label: string;
  required?: boolean;
}
