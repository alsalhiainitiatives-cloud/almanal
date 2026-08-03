import { supabase } from "@/integrations/supabase/client";

export type ContactMessageStatus = "new" | "in_progress" | "closed";

export type ContactMessage = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subject: string | null;
  program: string | null;
  message: string;
  status: string;
  priority: string;
  staff_note: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
};

export const MESSAGE_STATUS_LABELS: Record<string, string> = {
  new: "جديدة",
  in_progress: "قيد المعالجة",
  closed: "مغلقة",
};

export const MESSAGE_STATUS_STYLES: Record<string, string> = {
  new: "bg-gold/25 text-foreground",
  in_progress: "bg-primary/12 text-primary",
  closed: "bg-mint/30 text-foreground",
};

export const MESSAGE_PRIORITY_LABELS: Record<string, string> = {
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};

/** All contact messages — staff only (enforced by RLS). */
export async function fetchContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select(
      "id, name, phone, email, subject, program, message, status, priority, staff_note, handled_by, handled_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessage[];
}

export async function updateContactMessage(
  id: string,
  patch: { status?: ContactMessageStatus; priority?: string; staff_note?: string },
) {
  const payload: {
    status?: ContactMessageStatus;
    priority?: string;
    staff_note?: string;
    handled_by?: string | null;
    handled_at?: string | null;
  } = { ...patch };
  if (patch.status === "closed") {
    const { data: auth } = await supabase.auth.getUser();
    payload.handled_by = auth.user?.id ?? null;
    payload.handled_at = new Date().toISOString();
  }
  if (patch.status && patch.status !== "closed") {
    payload.handled_at = null;
    payload.handled_by = null;
  }
  const { error } = await supabase.from("contact_messages").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteContactMessage(id: string) {
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** CSV export of the currently visible messages (Excel-friendly, UTF-8 BOM). */
export function exportMessagesCsv(rows: ContactMessage[]) {
  const headers = [
    "التاريخ",
    "الاسم",
    "الجوال",
    "البريد",
    "الموضوع",
    "المرحلة",
    "الحالة",
    "الأهمية",
    "الرسالة",
    "ملاحظة الموظف",
  ];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((row) =>
    [
      new Date(row.created_at).toLocaleString("ar-SA"),
      row.name,
      row.phone,
      row.email ?? "",
      row.subject ?? "",
      row.program ?? "",
      MESSAGE_STATUS_LABELS[row.status] ?? row.status,
      MESSAGE_PRIORITY_LABELS[row.priority] ?? row.priority,
      row.message.replace(/\s+/g, " "),
      row.staff_note ?? "",
    ]
      .map(escape)
      .join(","),
  );
  const csv = `\uFEFF${[headers.map(escape).join(","), ...body].join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `contact-messages-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}