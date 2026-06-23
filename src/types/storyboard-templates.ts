import type { EffectPreset } from "@/types/animation";

export type StoryboardTemplateCategory =
  | "product"
  | "sale"
  | "trust"
  | "travel"
  | "saas"
  | "local";

export type StoryboardTemplateId =
  | "clean-air-product"
  | "flash-sale"
  | "premium-launch"
  | "health-wellness"
  | "finance-trust"
  | "travel-holiday"
  | "saas-app"
  | "local-service";

export interface StoryboardTemplateDefinition {
  id: StoryboardTemplateId;
  name: string;
  description: string;
  category: StoryboardTemplateCategory;
  sceneCount: number;
  keyEffects: string[];
  useCase: string;
  recommended?: boolean;
  totalDurationMs: number;
  transitionStyle?: string;
  requiredSlots?: import("./template-slots").TemplateSlotSpec[];
}

export interface TemplateEffectSpec {
  layerRef: string;
  preset: EffectPreset;
  startMs?: number;
  durationMs?: number;
}
