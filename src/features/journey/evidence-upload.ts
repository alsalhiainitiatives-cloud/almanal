/**
 * Browser-side evidence upload: validates kind + size, compresses images, and
 * stores the file in the private `journey-evidence` bucket.
 */
import { supabase } from "@/integrations/supabase/client";
import { optimizeAttachment } from "@/lib/upload-compression";
import {
  EVIDENCE_BUCKET,
  EVIDENCE_LIMITS_MB,
  evidenceKindOf,
  type EvidenceKind,
} from "./journey";

export type UploadedEvidence = {
  filePath: string;
  fileType: EvidenceKind;
  fileName: string;
  fileSize: number;
};

function extOf(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase().slice(0, 8) : "bin";
}

export async function uploadEvidence(file: File, folder: string): Promise<UploadedEvidence> {
  const kind = evidenceKindOf(file);
  if (!kind) throw new Error("نوع الملف غير مدعوم — يُسمح بالصور والفيديو والتسجيل الصوتي فقط.");

  const maxMb = EVIDENCE_LIMITS_MB[kind];
  let out = file;
  if (kind === "image") {
    const result = await optimizeAttachment(file, {
      maxDimension: 1800,
      quality: 0.82,
      maxMb,
      enabled: true,
    });
    out = result.file;
  } else if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`حجم الملف يتجاوز الحد المسموح (${maxMb} م.ب) — يرجى تقليل مدة التسجيل أو جودته.`);
  }

  const path = `${folder}/${crypto.randomUUID()}.${extOf(out.name)}`;
  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, out, { cacheControl: "3600", upsert: false, contentType: out.type || undefined });
  if (error) throw new Error("تعذّر رفع الدليل الرقمي — يرجى المحاولة مرة أخرى.");

  return { filePath: path, fileType: kind, fileName: out.name, fileSize: out.size };
}