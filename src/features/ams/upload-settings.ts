/** Shared attachment/upload policy shape (safe for client and server). */
export const UPLOAD_SETTINGS_KEY = "upload_settings";

export type UploadSettings = {
  maxDocumentMb: number;
  maxReceiptMb: number;
  compressImages: boolean;
  imageMaxDimension: number;
  imageQuality: number;
};

export const DEFAULT_UPLOAD_SETTINGS: UploadSettings = {
  maxDocumentMb: 10,
  maxReceiptMb: 5,
  compressImages: true,
  imageMaxDimension: 2000,
  imageQuality: 0.82,
};

export function normalizeUploadSettings(raw: unknown): UploadSettings {
  const v = (raw ?? {}) as Partial<UploadSettings>;
  const num = (value: unknown, fallback: number, min: number, max: number) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    maxDocumentMb: num(v.maxDocumentMb, DEFAULT_UPLOAD_SETTINGS.maxDocumentMb, 1, 50),
    maxReceiptMb: num(v.maxReceiptMb, DEFAULT_UPLOAD_SETTINGS.maxReceiptMb, 1, 50),
    compressImages: v.compressImages ?? DEFAULT_UPLOAD_SETTINGS.compressImages,
    imageMaxDimension: num(v.imageMaxDimension, DEFAULT_UPLOAD_SETTINGS.imageMaxDimension, 600, 4000),
    imageQuality: num(v.imageQuality, DEFAULT_UPLOAD_SETTINGS.imageQuality, 0.4, 1),
  };
}

export const PURGE_PHRASE = "حذف نهائي";
