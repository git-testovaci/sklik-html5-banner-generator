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
      className="absolute z-10 h-2.5 w-2.5 rounded-sm border border-violet-300 bg-violet-500 shadow"
      style={CORNER_STYLES[corner]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(e, corner);
      }}
    />
  );
}
