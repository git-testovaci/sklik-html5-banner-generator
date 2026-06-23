"use client";

import { useCallback } from "react";
import { clampPlacementLoose } from "@/lib/animation/timeline-utils";
import { CanvasResizeHandle } from "./CanvasResizeHandle";
import { CanvasSelectionOverlay } from "./CanvasSelectionOverlay";

type Corner = "tl" | "tr" | "bl" | "br";

export interface CanvasPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface InteractiveCanvasLayerProps {
  selected: boolean;
  interactive: boolean;
  placement: CanvasPlacement;
  rotation: number;
  zIndex: number;
  opacity: number;
  bannerWidth: number;
  bannerHeight: number;
  canvasScale: number;
  onSelect: () => void;
  onPlacementChange: (patch: Partial<CanvasPlacement>) => void;
  animClassName?: string;
  replayKey?: number;
  children: React.ReactNode;
}

export function InteractiveCanvasLayer({
  selected,
  interactive,
  placement,
  rotation,
  zIndex,
  opacity,
  bannerWidth,
  bannerHeight,
  canvasScale,
  onSelect,
  onPlacementChange,
  animClassName = "",
  replayKey = 0,
  children,
}: InteractiveCanvasLayerProps) {
  const applyPlacement = useCallback(
    (next: CanvasPlacement) => {
      onPlacementChange(clampPlacementLoose(next, bannerWidth, bannerHeight));
    },
    [bannerWidth, bannerHeight, onPlacementChange],
  );

  const startDrag = useCallback(
    (e: React.PointerEvent, mode: "move" | Corner) => {
      if (!interactive) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect();

      const scale = canvasScale > 0 ? canvasScale : 1;
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const origin = { ...placement };

      function onMove(ev: PointerEvent) {
        const dx = (ev.clientX - startClientX) / scale;
        const dy = (ev.clientY - startClientY) / scale;

        if (mode === "move") {
          applyPlacement({
            ...origin,
            x: origin.x + dx,
            y: origin.y + dy,
          });
          return;
        }

        let { x, y, width, height } = origin;

        if (mode === "br") {
          width = origin.width + dx;
          height = origin.height + dy;
        } else if (mode === "bl") {
          x = origin.x + dx;
          width = origin.width - dx;
          height = origin.height + dy;
        } else if (mode === "tr") {
          y = origin.y + dy;
          width = origin.width + dx;
          height = origin.height - dy;
        } else if (mode === "tl") {
          x = origin.x + dx;
          y = origin.y + dy;
          width = origin.width - dx;
          height = origin.height - dy;
        }

        applyPlacement({ x, y, width, height });
      }

      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [applyPlacement, canvasScale, interactive, onSelect, placement],
  );

  return (
    <div
      className={`absolute ${interactive ? "touch-none select-none" : ""}`}
      style={{
        left: placement.x,
        top: placement.y,
        width: placement.width,
        height: placement.height,
        zIndex,
        opacity,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
      }}
      onPointerDown={(e) => {
        if (!interactive) return;
        if ((e.target as HTMLElement).closest("[data-resize-handle]")) return;
        startDrag(e, "move");
      }}
      onClick={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <CanvasSelectionOverlay visible={interactive && selected} />
      {interactive && selected ? (
        <>
          {(["tl", "tr", "bl", "br"] as Corner[]).map((corner) => (
            <span key={corner} data-resize-handle>
              <CanvasResizeHandle corner={corner} onPointerDown={startDrag} />
            </span>
          ))}
        </>
      ) : null}
      <div
        key={replayKey}
        className={`h-full w-full ${animClassName}`}
        style={{ transformOrigin: "center center" }}
      >
        {children}
      </div>
    </div>
  );
}
