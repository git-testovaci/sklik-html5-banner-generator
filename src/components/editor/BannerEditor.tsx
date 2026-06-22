"use client";

import { useMemo, useState } from "react";
import { getMockValidationSummary } from "@/lib/mock-validation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import { BannerPreviewStage } from "./BannerPreviewStage";
import { EditorSettingsPanel } from "./EditorSettingsPanel";
import { EditorTopBar } from "./EditorTopBar";
import { ValidationExportPanel } from "./ValidationExportPanel";

interface BannerEditorProps {
  initialState: BannerEditorState;
}

export function BannerEditor({ initialState }: BannerEditorProps) {
  const [state, setState] = useState<BannerEditorState>(initialState);

  const onUpdate: BannerEditorStateUpdater = (patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const validation = useMemo(
    () => getMockValidationSummary(state),
    [state],
  );

  return (
    <div className="flex min-h-full flex-col">
      <EditorTopBar state={state} />

      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:items-stretch lg:gap-4 lg:p-4">
        <div className="order-2 lg:order-1">
          <EditorSettingsPanel state={state} onUpdate={onUpdate} />
        </div>

        <div className="order-1 flex min-h-[320px] flex-1 flex-col lg:order-2 lg:min-h-0">
          <BannerPreviewStage state={state} />
        </div>

        <div className="order-3">
          <ValidationExportPanel state={state} validation={validation} />
        </div>
      </div>
    </div>
  );
}
