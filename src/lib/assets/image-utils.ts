import type { AssetValidationResult } from "@/types/assets";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

const REJECTED_MIME_PREFIXES = ["video/", "application/zip", "text/html", "text/javascript"];

export function validateImageFile(file: File): AssetValidationResult {
  const warnings: string[] = [];

  if (REJECTED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
    return { valid: false, message: "Unsupported file type.", warnings };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const extMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
      avif: "image/avif",
    };
    if (!extMap[ext]) {
      return {
        valid: false,
        message: "Only PNG, JPEG, WebP, GIF, SVG, or AVIF images are allowed.",
        warnings,
      };
    }
  }

  if (file.size > 500_000) {
    warnings.push("Large image — may push ZIP export over 250 kB Sklik limit.");
  }

  return { valid: true, message: "OK", warnings };
}

export function resolveMimeType(file: File): string {
  if (ALLOWED_MIME_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
  };
  return extMap[ext] ?? "application/octet-stream";
}

export async function readImageDimensions(
  file: Blob,
): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(file);
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dims;
    } catch {
      // fall through
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function compressImageIfNeeded(
  file: File,
  maxWidth = 1200,
  quality = 0.82,
): Promise<{ blob: Blob; compressed: boolean }> {
  const mime = resolveMimeType(file);
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
    return { blob: file, compressed: false };
  }

  if (file.size < 80_000) {
    return { blob: file, compressed: false };
  }

  try {
    const dims = await readImageDimensions(file);
    if (!dims || dims.width <= maxWidth) {
      return { blob: file, compressed: false };
    }

    const scale = maxWidth / dims.width;
    const targetW = Math.round(dims.width * scale);
    const targetH = Math.round(dims.height * scale);

    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return { blob: file, compressed: false };
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const outputType = mime === "image/png" ? "image/webp" : mime;
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), outputType, quality);
    });

    if (blob && blob.size < file.size) {
      return { blob, compressed: true };
    }
    return { blob: file, compressed: false };
  } catch {
    return { blob: file, compressed: false };
  }
}

export function createPreviewObjectUrl(file: Blob): string | null {
  try {
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} kB`;
}
