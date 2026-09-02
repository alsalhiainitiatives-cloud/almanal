/**
 * Browser-side evidence upload for lesson assessments: validates the kind and
 * size, compresses images, then stores the file in the private
 * `journey-evidence` bucket under an `assessments/` prefix.
 */
import { supabase } from "@/integrations/supabase/client";
import { optimizeAttachment } from "@/lib/upload-compression";
import {
  ASSESSMENT_BUCKET,
  ASSESSMENT_EVIDENCE_LIMITS_MB,
  assessmentEvidenceKind,
  type UploadedEvidenceKind,
} from "./assessments";

export type UploadedAssessmentEvidence = {
  filePath: string;
  fileType: UploadedEvidenceKind;
  fileName: string;
  fileSize: number;
};

function extOf(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase().slice(0, 8) : "bin";
}

export async function uploadAssessmentEvidence(
  file: File,
  folder: string,
): Promise<UploadedAssessmentEvidence> {
  const kind = assessmentEvidenceKind(file);
  if (!kind) throw new Error("نوع الملف غير مدعوم — يُسمح بالصور والفيديو وملفات PDF فقط.");

  const maxMb = ASSESSMENT_EVIDENCE_LIMITS_MB[kind];
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
    throw new Error(`حجم الملف يتجاوز الحد المسموح (${maxMb} م.ب).`);
  }

  const path = `assessments/${folder}/${crypto.randomUUID()}.${extOf(out.name)}`;
  const { error } = await supabase.storage
    .from(ASSESSMENT_BUCKET)
    .upload(path, out, { cacheControl: "3600", upsert: false, contentType: out.type || undefined });
  if (error) throw new Error("تعذّر رفع الدليل الرقمي — يرجى المحاولة مرة أخرى.");

  return { filePath: path, fileType: kind, fileName: out.name, fileSize: out.size };
}
