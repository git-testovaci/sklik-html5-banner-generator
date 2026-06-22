export type ProjectStatus = "draft" | "shared" | "exported";

export interface BannerProject {
  id: string;
  name: string;
  status: ProjectStatus;
  width: number;
  height: number;
  headline: string;
  subheadline: string;
  cta: string;
  updatedAt: string;
  shareId?: string;
}

export interface DashboardStats {
  total: number;
  drafts: number;
  shared: number;
  exported: number;
}
