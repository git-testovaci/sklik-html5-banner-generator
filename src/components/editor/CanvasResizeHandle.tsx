"use client";

type Corner = "tl" | "tr" | "bl" | "br";

interface CanvasResizeHandleProps {
  corner: Corner;
  onPointerDown: (e: React.PointerEvent, corner: Corner) => void;
}

const CORNER_STYLES: Record<Corner, React.CSSProperties> = {
  tl: { top: -4, left: -4, cursor: "nwse-resize" },
  tr: { top: -4, right: -4, cursor: "nesw-resize" },
  bl: { bottom: -4, left: -4, cursor: "nesw-resize" },
  br: { bottom: -4, right: -4, cursor: "nwse-resize" },
};

export function CanvasResizeHandle({ corner, onPointerDown }: CanvasResizeHandleProps) {
  return (
    <span
      role="presentation"
      data-resize-handle
      className="absolute z-20 h-3 w-3 rounded-sm border-2 border-white bg-violet-500 shadow-md"
      style={{ ...CORNER_STYLES[corner], pointerEvents: "auto" }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPointerDown(e, corner);
      }}
    />
  );
}
