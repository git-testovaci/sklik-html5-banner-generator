import { formatBannerSize } from "@/lib/banner-sizes";
import type { BannerEditorState, ValidationSummary } from "@/types/editor";

export function getMockValidationSummary(
  state: BannerEditorState,
): ValidationSummary {
  const sizeLabel = formatBannerSize(state.width, state.height);
  const hasProductImage = state.productImageLabel.trim().length > 0;

  const rows: ValidationSummary["rows"] = [
    {
      id: "zip-size",
      label: "ZIP size",
      value: "184 kB",
      status: "pass",
    },
    {
      id: "file-count",
      label: "File count",
      value: "5 / 40",
      status: "pass",
    },
    {
      id: "html-file",
      label: "HTML file",
      value: "1 HTML file",
      status: "pass",
    },
    {
      id: "banner-size",
      label: "Banner size",
      value: sizeLabel,
      status: "pass",
    },
    {
      id: "forbidden-js",
      label: "Forbidden JS",
      value: "None detected",
      status: "pass",
    },
    {
      id: "external-sources",
      label: "External sources",
      value: "None",
      status: "pass",
    },
    {
      id: "image-optimization",
      label: "Image optimization",
      value: hasProductImage
        ? "Product image not optimized"
        : "No images to optimize",
      status: hasProductImage ? "warn" : "pass",
    },
  ];

  const hasWarn = rows.some((r) => r.status === "warn");
  const hasFail = rows.some((r) => r.status === "fail");

  return {
    rows,
    exportReady: !hasFail,
    overallStatus: hasFail ? "fail" : hasWarn ? "warn" : "pass",
  };
}
