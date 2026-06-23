"use client";

import type { WorkflowGuidance } from "@/lib/editor/workflow-guidance";

interface WorkflowGuidanceProps {
  guidance: WorkflowGuidance;
  onDismiss: () => void;
  onAction?: () => void;
}

export function WorkflowGuidanceBox({ guidance, onDismiss, onAction }: WorkflowGuidanceProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-sky-900/40 bg-sky-950/25 px-3 py-2.5"
    >
      <span className="mt-0.5 text-sky-400" aria-hidden>
        →
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-snug text-sky-100">{guidance.message}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {guidance.actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="rounded border border-sky-700/50 bg-sky-900/40 px-2 py-0.5 text-[10px] font-medium text-sky-200 hover:bg-sky-900/60"
            >
              {guidance.actionLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded px-2 py-0.5 text-[10px] text-sky-400/80 hover:text-sky-300"
          >
            Skrýt
          </button>
        </div>
      </div>
    </div>
  );
}
