import type { ProjectStatus } from "@/types/project";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-zinc-700/60 text-zinc-300 ring-zinc-600/50",
  },
  shared: {
    label: "Shared",
    className: "bg-sky-950/60 text-sky-300 ring-sky-800/50",
  },
  exported: {
    label: "Exported",
    className: "bg-emerald-950/60 text-emerald-300 ring-emerald-800/50",
  },
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}
