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

const MAX_UPLOAD_BYTES = 1_000_000;
const COMPRESS_THRESHOLD_BYTES = 60_000;
const PREVIEW_MAX_DIMENSION = 1000;
const PREVIEW_QUALITY = 0.75;

export function validateImageFile(file: File): AssetValidationResult {
  const warnings: string[] = [];

  if (REJECTED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
    if (file.type.startsWith("video/")) {
      return {
        valid: false,
        message: "Video není pro Sklik HTML5 ZIP podporované. Použijte obrázek nebo animaci z vrstev.",
        warnings,
      };
    }
    return { valid: false, message: "Nepodporovaný typ souboru.", warnings };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      message: "Image exceeds 1 MB. Compress or resize before uploading.",
      warnings,
    };
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

  const mime = resolveMimeType(file);
  if (mime === "image/gif") {
    warnings.push("GIF images use more memory in preview — keep file size small.");
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
  const mime = file.type || "";
  if (mime === "image/svg+xml") {
    return readSvgDimensions(file);
  }

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

async function readSvgDimensions(
  file: Blob,
): Promise<{ width: number; height: number } | null> {
  try {
    const text = await file.text();
    const widthMatch = text.match(/\bwidth=["']([\d.]+)/i);
    const heightMatch = text.match(/\bheight=["']([\d.]+)/i);
    const viewBoxMatch = text.match(/viewBox=["'][\d.\s]+[\s]+[\d.\s]+[\s]+([\d.]+)[\s]+([\d.]+)/i);
    const w = widthMatch ? Number(widthMatch[1]) : viewBoxMatch ? Number(viewBoxMatch[1]) : 0;
    const h = heightMatch ? Number(heightMatch[1]) : viewBoxMatch ? Number(viewBoxMatch[2]) : 0;
    if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
    return { width: 200, height: 200 };
  } catch {
    return { width: 200, height: 200 };
  }
}

export async function compressImageIfNeeded(
  file: File,
  maxWidth = PREVIEW_MAX_DIMENSION,
  quality = PREVIEW_QUALITY,
): Promise<{ blob: Blob; compressed: boolean }> {
  const mime = resolveMimeType(file);
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
    return { blob: file, compressed: false };
  }

  const needsCompress =
    file.size >= COMPRESS_THRESHOLD_BYTES;

  if (!needsCompress) {
    try {
      const dims = await readImageDimensions(file);
      if (!dims || dims.width <= maxWidth) {
        return { blob: file, compressed: false };
      }
    } catch {
      return { blob: file, compressed: false };
    }
  }

  try {
    const dims = await readImageDimensions(file);
    if (!dims) {
      return { blob: file, compressed: false };
    }

    const scale = dims.width > maxWidth ? maxWidth / dims.width : 1;
    const targetW = Math.max(1, Math.round(dims.width * scale));
    const targetH = Math.max(1, Math.round(dims.height * scale));

    if (scale >= 1 && file.size < COMPRESS_THRESHOLD_BYTES) {
      return { blob: file, compressed: false };
    }

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

    if (blob && (blob.size < file.size || scale < 1)) {
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
