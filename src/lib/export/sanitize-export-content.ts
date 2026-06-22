const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtmlText(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE[char] ?? char);
}

export function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value).replace(/`/g, "&#96;");
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FUNC_COLOR =
  /^(rgb|rgba|hsl|hsla)\(\s*[0-9.%a-zA-Z,\s]+\)$/i;

export function sanitizeCssColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (HEX_COLOR.test(trimmed) || FUNC_COLOR.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function sanitizePlainText(
  value: string,
  fallback: string,
  maxLength = 200,
): string {
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
}
