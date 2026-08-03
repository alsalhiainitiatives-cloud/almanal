/**
 * Client-side attachment optimizer.
 *
 * Images are downscaled and re-encoded (JPEG/WebP) so uploads stay small
 * without visible quality loss; other formats (PDF, docs) are passed through
 * and only validated against the configured size limit.
 */
export type CompressOptions = {
  /** Longest edge in pixels. */
  maxDimension: number;
  /** 0.4 – 1 encoder quality. */
  quality: number;
  /** Hard limit in megabytes. */
  maxMb: number;
  /** Disable image re-encoding entirely. */
  enabled?: boolean;
};

export type CompressResult = {
  file: File;
  originalSize: number;
  finalSize: number;
  compressed: boolean;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/heic", "image/heif"];

function fmt(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} م.ب`;
  return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
}

export function formatSize(bytes: number) {
  return fmt(bytes);
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode-failed"));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function renameTo(name: string, ext: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}.${ext}`;
}

/**
 * Compresses an attachment when possible and enforces the size limit.
 * Throws a user-facing Arabic error when the final file is still too large.
 */
export async function optimizeAttachment(file: File, opts: CompressOptions): Promise<CompressResult> {
  const limit = Math.max(1, opts.maxMb) * 1024 * 1024;
  const isImage = IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp|bmp|heic|heif)$/i.test(file.name);

  let out = file;
  let compressed = false;

  if (isImage && opts.enabled !== false && typeof document !== "undefined") {
    try {
      const bitmap = await loadBitmap(file);
      const w = "width" in bitmap ? bitmap.width : 0;
      const h = "height" in bitmap ? bitmap.height : 0;
      if (w && h) {
        const scale = Math.min(1, opts.maxDimension / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);

          let quality = Math.min(1, Math.max(0.4, opts.quality));
          let blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
          );
          // Step the quality down until the limit is respected.
          while (blob && blob.size > limit && quality > 0.45) {
            quality = Math.max(0.4, quality - 0.12);
            blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
            );
          }
          if (blob && blob.size < file.size) {
            out = new File([blob], renameTo(file.name, "jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            compressed = true;
          }
        }
      }
      if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
    } catch {
      out = file;
    }
  }

  if (out.size > limit) {
    throw new Error(
      `حجم الملف ${fmt(out.size)} يتجاوز الحد المسموح (${opts.maxMb} م.ب). يرجى تصغير الملف ثم إعادة المحاولة.`,
    );
  }

  return { file: out, originalSize: file.size, finalSize: out.size, compressed };
}
