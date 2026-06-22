import type { Metadata } from "next";
import { ImportBannerClient } from "@/components/import/ImportBannerClient";

export const metadata: Metadata = {
  title: "Import HTML5 banner — Sklik HTML5 Banner Generator",
  description: "Upload and analyze an existing HTML5 banner ZIP",
};

export default function ImportPage() {
  return <ImportBannerClient />;
}
