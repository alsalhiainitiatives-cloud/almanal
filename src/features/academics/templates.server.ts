/**
 * Server-only service for ready-made chat message templates.
 *
 * Templates are written by teachers and administration and can be inserted into
 * a group or private message at any time. RLS decides who may read and edit:
 * every query runs as the signed-in user.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { MessageTemplate } from "./templates";

type Db = SupabaseClient<Database>;

/** Templates visible to the caller: shared school-wide ones plus this classroom's. */
export async function listMessageTemplates(
  supabase: Db,
  userId: string,
  input: { classroomId?: string | null },
): Promise<MessageTemplate[]> {
  let query = supabase
    .from("chat_message_templates")
    .select("id, title, body, classroom_id, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  query = input.classroomId
    ? query.or(`classroom_id.is.null,classroom_id.eq.${input.classroomId}`)
    : query.is("classroom_id", null);

  const { data, error } = await query;
  if (error) throw new Error("تعذّر تحميل قوالب الرسائل.");

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    classroomId: row.classroom_id,
    mine: row.created_by === userId,
  }));
}

export type SaveTemplateInput = {
  id?: string | null;
  title: string;
  body: string;
  classroomId?: string | null;
};

/** Creates or updates one template. */
export async function saveMessageTemplate(supabase: Db, userId: string, input: SaveTemplateInput) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new Error("اكتبي عنوان القالب.");
  if (!body) throw new Error("اكتبي نص القالب.");

  if (input.id) {
    const { error } = await supabase
      .from("chat_message_templates")
      .update({ title, body, classroom_id: input.classroomId ?? null })
      .eq("id", input.id);
    if (error) throw new Error("تعذّر تعديل القالب.");
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("chat_message_templates")
    .insert({ title, body, classroom_id: input.classroomId ?? null, created_by: userId })
    .select("id")
    .maybeSingle();
  if (error || !data?.id) throw new Error("تعذّر حفظ القالب — تأكدي من صلاحياتك.");
  return { id: data.id };
}

/** Removes a template (its owner, or administration). */
export async function deleteMessageTemplate(supabase: Db, _userId: string, id: string) {
  const { error } = await supabase.from("chat_message_templates").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف القالب.");
  return { ok: true };
}
