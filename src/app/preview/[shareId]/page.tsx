import type { Metadata } from "next";
import { PublicPreviewShell } from "@/components/preview/PublicPreviewShell";

interface PreviewPageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({
  params,
}: PreviewPageProps): Promise<Metadata> {
  const { shareId } = await params;

  return {
    title: `Preview — ${shareId}`,
    description: "Read-only banner preview",
  };
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { shareId } = await params;
  return <PublicPreviewShell shareId={shareId} />;
}
