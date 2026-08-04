import { supabase } from "@/integrations/supabase/client";

export type InboxSubject = "message" | "testimonial";

export type InboxEvent = {
  id: string;
  subject_type: string;
  subject_id: string;
  actor_id: string;
  actor_name: string | null;
  action: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  created_at: string;
};

export const INBOX_ACTION_LABELS: Record<string, string> = {
  status: "تغيير الحالة",
  priority: "تغيير الأهمية",
  note: "تحديث ملاحظة داخلية",
  reply_whatsapp: "رد عبر واتساب",
  reply_email: "رد عبر البريد",
  delete: "حذف نهائي",
  moderate: "مراجعة التقييم",
};

/** Audit trail for a set of messages/reviews (staff-only by RLS). */
export async function fetchInboxEvents(subjectType: InboxSubject): Promise<InboxEvent[]> {
  const { data, error } = await supabase
    .from("inbox_events")
    .select("*")
    .eq("subject_type", subjectType)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as InboxEvent[];
}

/** Never throws: a failed audit write must not block the staff action. */
export async function logInboxEvent(input: {
  subjectType: InboxSubject;
  subjectId: string;
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return;
  const { error } = await supabase.from("inbox_events").insert({
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    actor_id: user.id,
    actor_name:
      (user.user_metadata?.full_name as string | undefined)?.trim() || user.email || null,
    action: input.action,
    from_value: input.fromValue ?? null,
    to_value: input.toValue ?? null,
    note: input.note ?? null,
  });
  if (error) console.error("inbox audit failed", error.message);
}