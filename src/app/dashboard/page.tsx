import type { Metadata } from "next";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard — Sklik HTML5 Banner Generator",
  description: "Internal studio for HTML5 banner production",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
