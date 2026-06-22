import type { BannerAnimation, BannerEditorState } from "@/types/editor";

interface BannerPreviewProps {
  state: BannerEditorState;
  className?: string;
}

const ANIMATION_CLASS: Record<BannerAnimation, string> = {
  none: "",
  "fade-in": "banner-anim-fade-in",
  "slide-up": "banner-anim-slide-up",
  "soft-pulse": "banner-anim-soft-pulse",
};

function getLayoutMode(width: number, height: number): "horizontal" | "vertical" | "square" {
  const ratio = width / height;
  if (ratio >= 2.5) return "horizontal";
  if (ratio <= 0.75) return "vertical";
  return "square";
}

export function BannerPreview({ state, className = "" }: BannerPreviewProps) {
  const layout = getLayoutMode(state.width, state.height);
  const animClass = ANIMATION_CLASS[state.animation];
  const showProduct = state.productImageLabel.trim().length > 0;

  return (
    <>
      <style>{`
        @keyframes banner-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes banner-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes banner-soft-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .banner-anim-fade-in { animation: banner-fade-in 0.8s ease-out forwards; }
        .banner-anim-slide-up { animation: banner-slide-up 0.7s ease-out forwards; }
        .banner-anim-soft-pulse { animation: banner-soft-pulse 2.5s ease-in-out infinite; }
      `}</style>

      <div
        className={`overflow-hidden shadow-2xl ${animClass} ${className}`}
        style={{
          width: state.width,
          height: state.height,
          backgroundColor: state.backgroundColor,
          color: state.textColor,
        }}
        role="img"
        aria-label={`Banner preview: ${state.headline}`}
      >
        {layout === "horizontal" ? (
          <HorizontalLayout state={state} showProduct={showProduct} />
        ) : layout === "vertical" ? (
          <VerticalLayout state={state} showProduct={showProduct} />
        ) : (
          <SquareLayout state={state} showProduct={showProduct} />
        )}
      </div>
    </>
  );
}

function LogoPlaceholder({ label, accentColor }: { label: string; accentColor: string }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: `${accentColor}33`,
        border: `1px solid ${accentColor}66`,
        color: accentColor,
        fontSize: "0.55em",
        padding: "0.4em 0.6em",
        minWidth: "3.5em",
        minHeight: "1.8em",
      }}
    >
      {label.slice(0, 12)}
    </div>
  );
}

function ProductPlaceholder({ label, accentColor }: { label: string; accentColor: string }) {
  return (
    <div
      className="flex items-center justify-center rounded"
      style={{
        backgroundColor: `${accentColor}22`,
        border: `1px dashed ${accentColor}55`,
        color: accentColor,
        fontSize: "0.5em",
        padding: "0.5em",
        flex: "1 1 auto",
        minHeight: "2.5em",
        minWidth: "2.5em",
      }}
    >
      {label.slice(0, 16)}
    </div>
  );
}

function CtaButton({ state }: { state: BannerEditorState }) {
  return (
    <span
      className="inline-block shrink-0 rounded font-semibold"
      style={{
        backgroundColor: state.ctaBackgroundColor,
        color: state.ctaTextColor,
        fontSize: "0.55em",
        padding: "0.45em 0.9em",
        lineHeight: 1.2,
      }}
    >
      {state.cta}
    </span>
  );
}

function TextBlock({ state, compact }: { state: BannerEditorState; compact?: boolean }) {
  return (
    <div className="min-w-0 flex-1" style={{ lineHeight: 1.25 }}>
      <p
        className="font-bold leading-tight"
        style={{
          fontSize: compact ? "0.65em" : "0.75em",
          color: state.textColor,
        }}
      >
        {state.headline}
      </p>
      {!compact && (
        <p
          className="mt-1 opacity-80"
          style={{ fontSize: "0.5em", color: state.textColor }}
        >
          {state.subheadline}
        </p>
      )}
    </div>
  );
}

function HorizontalLayout({
  state,
  showProduct,
}: {
  state: BannerEditorState;
  showProduct: boolean;
}) {
  return (
    <div
      className="flex h-full items-center gap-[0.6em]"
      style={{ padding: "0.6em 0.8em" }}
    >
      <LogoPlaceholder label={state.logoLabel} accentColor={state.accentColor} />
      <TextBlock state={state} compact />
      {showProduct && (
        <ProductPlaceholder label={state.productImageLabel} accentColor={state.accentColor} />
      )}
      <CtaButton state={state} />
    </div>
  );
}

function VerticalLayout({
  state,
  showProduct,
}: {
  state: BannerEditorState;
  showProduct: boolean;
}) {
  return (
    <div
      className="flex h-full flex-col"
      style={{ padding: "0.8em" }}
    >
      <div className="mb-[0.6em] flex items-center justify-between gap-2">
        <LogoPlaceholder label={state.logoLabel} accentColor={state.accentColor} />
      </div>
      {showProduct && (
        <div className="mb-[0.6em] flex-1">
          <ProductPlaceholder label={state.productImageLabel} accentColor={state.accentColor} />
        </div>
      )}
      <TextBlock state={state} />
      <div className="mt-[0.6em]">
        <CtaButton state={state} />
      </div>
    </div>
  );
}

function SquareLayout({
  state,
  showProduct,
}: {
  state: BannerEditorState;
  showProduct: boolean;
}) {
  return (
    <div
      className="flex h-full flex-col"
      style={{ padding: "0.7em" }}
    >
      <div className="mb-[0.5em] flex items-start justify-between gap-2">
        <LogoPlaceholder label={state.logoLabel} accentColor={state.accentColor} />
      </div>
      <div className="flex flex-1 gap-[0.5em]">
        <div className="flex flex-1 flex-col justify-center">
          <TextBlock state={state} />
          <div className="mt-[0.5em]">
            <CtaButton state={state} />
          </div>
        </div>
        {showProduct && (
          <div className="w-[38%] shrink-0">
            <ProductPlaceholder label={state.productImageLabel} accentColor={state.accentColor} />
          </div>
        )}
      </div>
    </div>
  );
}
