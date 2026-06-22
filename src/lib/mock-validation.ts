import { getValidationSummary } from "@/lib/validation-rules";
import type { BannerEditorState } from "@/types/editor";
import type { ValidationSummary } from "@/types/validation";

export function getMockValidationSummary(
  state: BannerEditorState,
): ValidationSummary {
  return getValidationSummary(state);
}
