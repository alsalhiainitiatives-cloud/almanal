import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ERRORS: Record<string, string> = {
  identifier_too_short: "الرقم المدخل غير صالح — أدخل رقم هوية الطفل أو رقمه الأكاديمي كاملًا.",
  child_not_found:
    "لم نجد طالبًا مطابقًا لهذا الرقم. تأكد من رقم الهوية أو الرقم الأكاديمي، أو تواصل مع إدارة المدرسة.",
  already_linked: "هذا الطالب مرتبط بحساب ولي أمر آخر — يرجى التواصل مع إدارة المدرسة.",
  forbidden: "يجب تسجيل الدخول أولًا.",
};

/** Parent links their own children using the child's national ID or academic number. */
export const linkMyChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ identifier: z.string().trim().min(5).max(40) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("claim_child_by_identifier", {
      _identifier: data.identifier,
    });
    if (error) {
      const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
      throw new Error(key ? ERRORS[key] : "تعذّر إتمام الربط، حاول مرة أخرى.");
    }
    const first = (rows as { child_names: string[] }[] | null)?.[0];
    return { childNames: first?.child_names ?? [] };
  });

/** Children already linked to the signed-in guardian account. */
export const myLinkedChildren = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Staff accounts own imported/placeholder student records technically, but those
    // are NOT their own children — the guardian linking page must stay parent-only.
    const { data: isStaff } = await context.supabase.rpc("is_school_staff", {
      _user_id: context.userId,
    });
    if (isStaff === true) return { children: [], staff: true as const };

    const { data } = await context.supabase
      .from("application_children")
      .select(
        "id, name_ar, national_id, stage_id, classroom_id, applications!inner ( student_number, application_number, status, parent_id )",
      )
      .eq("applications.parent_id", context.userId)
      .order("name_ar")
      .limit(50);

    const [{ data: stages }, { data: classrooms }] = await Promise.all([
      context.supabase.from("stages").select("id, name_ar"),
      context.supabase.from("classrooms").select("id, name_ar"),
    ]);

    type App = {
      student_number: string | null;
      application_number: string | null;
      status: string;
    };

    return {
      staff: false as const,
      children: (data ?? []).map((row) => {
        const app = row.applications as unknown as App;
        return {
          id: row.id,
          name: row.name_ar,
          academicNumber: app.student_number ?? app.application_number ?? null,
          status: app.status,
          stage: (stages ?? []).find((s) => s.id === row.stage_id)?.name_ar ?? null,
          classroom: (classrooms ?? []).find((c) => c.id === row.classroom_id)?.name_ar ?? null,
        };
      }),
    };
  });
