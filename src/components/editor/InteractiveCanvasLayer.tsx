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
  locked?: boolean;
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
  scrubStyle?: Pick<React.CSSProperties, "opacity" | "transform">;
  children: React.ReactNode;
}

function clampResize(
  x: number,
  y: number,
  width: number,
  height: number,
  bannerWidth: number,
  bannerHeight: number,
): CanvasPlacement {
  return clampPlacementLoose({ x, y, width, height }, bannerWidth, bannerHeight, 8);
}

export function InteractiveCanvasLayer({
  selected,
  interactive,
  locked = false,
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
  scrubStyle,
  children,
}: InteractiveCanvasLayerProps) {
  const applyPlacement = useCallback(
    (next: CanvasPlacement) => {
      onPlacementChange(clampResize(next.x, next.y, next.width, next.height, bannerWidth, bannerHeight));
    },
    [bannerWidth, bannerHeight, onPlacementChange],
  );

  const startDrag = useCallback(
    (e: React.PointerEvent, mode: "move" | Corner) => {
      if (!interactive || locked) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect();

      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

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

      function onUp(ev: PointerEvent) {
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          // ignore
        }
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        target.removeEventListener("pointercancel", onUp);
      }

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
      target.addEventListener("pointercancel", onUp);
    },
    [applyPlacement, canvasScale, interactive, locked, onSelect, placement],
  );

  const outerTransform = scrubStyle?.transform
    ? `${scrubStyle.transform} rotate(${rotation}deg)`
    : `rotate(${rotation}deg)`;
  const outerOpacity = scrubStyle?.opacity ?? opacity;
  const canInteract = interactive && !locked;

  return (
    <div
      className={`absolute ${interactive ? "touch-none select-none" : ""} ${locked && interactive ? "cursor-not-allowed" : canInteract ? "cursor-move" : ""}`}
      style={{
        left: placement.x,
        top: placement.y,
        width: placement.width,
        height: placement.height,
        zIndex,
        opacity: outerOpacity,
        transform: outerTransform,
        transformOrigin: "center center",
      }}
      onPointerDown={(e) => {
        if (!interactive) return;
        if ((e.target as HTMLElement).closest("[data-resize-handle]")) return;
        if (locked) {
          e.stopPropagation();
          onSelect();
          return;
        }
        if (!canInteract) return;
        startDrag(e, "move");
      }}
      onClick={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <CanvasSelectionOverlay visible={interactive && selected} locked={locked} />
      {canInteract && selected ? (
        <>
          {(["tl", "tr", "bl", "br"] as Corner[]).map((corner) => (
            <CanvasResizeHandle
              key={corner}
              corner={corner}
              onPointerDown={startDrag}
            />
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
