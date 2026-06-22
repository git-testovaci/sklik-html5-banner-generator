import { generateShareId } from "@/lib/share-links";
import type { BannerProject } from "@/types/project";

export const DEFAULT_PROJECT_COLORS = {
  backgroundColor: "#0f172a",
  textColor: "#f8fafc",
  ctaBackgroundColor: "#7c3aed",
  ctaTextColor: "#ffffff",
  accentColor: "#a78bfa",
} as const;

export interface CreateBannerProjectInput {
  name: string;
  width: number;
  height: number;
  headline: string;
  subheadline: string;
  cta: string;
}

export function createBannerProject(
  input: CreateBannerProjectInput,
): BannerProject {
  const now = new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 6);

  return {
    id: `proj-${Date.now()}-${suffix}`,
    name: input.name.trim() || "Untitled banner",
    status: "draft",
    width: input.width,
    height: input.height,
    headline: input.headline.trim() || "Your headline here",
    subheadline: input.subheadline.trim() || "Supporting message",
    cta: input.cta.trim() || "Learn more",
    ...DEFAULT_PROJECT_COLORS,
    animation: "fade-in",
    logoLabel: "Logo",
    productImageLabel: "Product",
    shareId: generateShareId(),
    createdAt: now,
    updatedAt: now,
  };
}
