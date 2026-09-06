/**
 * Browser-side attachment upload for private chats.
 *
 * Files land under `private/<chatId>/` inside the same private `classroom-media`
 * bucket, and only the two members of that conversation may write there.
 */
import { supabase } from "@/integrations/supabase/client";
import { optimizeAttachment } from "@/lib/upload-compression";
import { CHAT_BUCKET } from "./chat";
import {
  PRIVATE_CHAT_FOLDER,
  PRIVATE_LIMITS_MB,
  privateAttachmentKind,
  type PrivateAttachmentKind,
} from "./private-chat";

function extOf(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase().slice(0, 8) : "bin";
}

export type UploadedPrivateAttachment = {
  path: string;
  kind: PrivateAttachmentKind;
  name: string;
};

export async function uploadPrivateAttachment(
  file: File,
  chatId: string,
): Promise<UploadedPrivateAttachment> {
  const kind = privateAttachmentKind(file);
  if (!kind) throw new Error("نوع الملف غير مدعوم — يُسمح بالصور والفيديو وملفات PDF والمستندات.");

  const maxMb = PRIVATE_LIMITS_MB[kind];
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

  const path = `${PRIVATE_CHAT_FOLDER}/${chatId}/${crypto.randomUUID()}.${extOf(out.name)}`;
  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(path, out, { cacheControl: "3600", upsert: false, contentType: out.type || undefined });
  if (error) throw new Error("تعذّر رفع المرفق — يرجى المحاولة مرة أخرى.");

  return { path, kind, name: out.name };
}
