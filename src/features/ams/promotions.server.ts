/**
 * Server-only age-based promotion (stage transfer) tracking.
 *
 * Rules map "when a child reaches N months, they belong in stage X".
 * The due list is computed live from each child's birth date, so it always
 * reflects the current date without any scheduled job.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { ageInMonths } from "@/features/admissions/eligibility";
import type { AppRole } from "@/features/auth/rbac";
import { notify } from "@/features/notifications/notifications.server";
import type { Database } from "@/integrations/supabase/types";
import { can, type Capability } from "./roles";

type Db = SupabaseClient<Database>;

async function rolesOf(supabase: Db, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

async function guard(supabase: Db, userId: string, capability: Capability) {
  const roles = await rolesOf(supabase, userId);
  if (!can(roles, capability)) throw new Error("ليس لديك صلاحية إدارة نقل الطلاب بين المراحل.");
  return roles;
}

export type PromotionCandidate = {
  childId: string;
  name_ar: string;
  birth_date: string | null;
  ageMonths: number | null;
  applicationId: string;
  applicationNumber: string | null;
  studentNumber: string | null;
  parentId: string;
  fromStageId: string | null;
  toStageId: string;
  classroomId: string | null;
  minAgeMonths: number;
  /** Months remaining before the threshold — 0 or less means overdue. */
  monthsToGo: number;
  ready: boolean;
};

/** Rules + live due/upcoming transfer list + history. */
export async function listPromotions(supabase: Db, userId: string) {
  await guard(supabase, userId, "view");

  const [rules, stages, classrooms, children, history] = await Promise.all([
    supabase.from("promotion_rules").select("*").order("sort_order"),
    supabase.from("stages").select("id, name_ar, slug, sort_order, min_age_months, max_age_months").order("sort_order"),
    supabase.from("classrooms").select("id, name_ar, stage_id, capacity, taken_seats, min_age_months, max_age_months, is_active").order("sort_order"),
    supabase
      .from("application_children")
      .select(
        "id, name_ar, birth_date, stage_id, classroom_id, applications!inner(id, application_number, student_number, status, parent_id)",
      )
      .in("applications.status", ["approved"])
      .limit(600),
    supabase
      .from("student_promotions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const activeRules = (rules.data ?? []).filter((r) => r.is_active);
  const done = new Set(
    (history.data ?? []).map((h) => `${h.child_id}:${h.to_stage_id}:${h.status}`),
  );

  const candidates: PromotionCandidate[] = [];
  for (const row of children.data ?? []) {
    const app = row.applications as unknown as {
      id: string;
      application_number: string | null;
      student_number: string | null;
      parent_id: string;
    };
    const months = ageInMonths(row.birth_date);
    if (months === null) continue;

    for (const rule of activeRules) {
      if (rule.from_stage_id && rule.from_stage_id !== row.stage_id) continue;
      if (!rule.from_stage_id && row.stage_id === rule.to_stage_id) continue;
      if (row.stage_id === rule.to_stage_id) continue;
      if (done.has(`${row.id}:${rule.to_stage_id}:done`)) continue;
      if (done.has(`${row.id}:${rule.to_stage_id}:dismissed`)) continue;

      const notice = Number(rule.notice_months ?? 0);
      const monthsToGo = Number(rule.min_age_months) - months;
      if (monthsToGo > notice) continue;

      candidates.push({
        childId: row.id,
        name_ar: row.name_ar,
        birth_date: row.birth_date,
        ageMonths: months,
        applicationId: app.id,
        applicationNumber: app.application_number,
        studentNumber: app.student_number,
        parentId: app.parent_id,
        fromStageId: row.stage_id,
        toStageId: rule.to_stage_id,
        classroomId: row.classroom_id,
        minAgeMonths: Number(rule.min_age_months),
        monthsToGo,
        ready: monthsToGo <= 0,
      });
    }
  }

  candidates.sort((a, b) => a.monthsToGo - b.monthsToGo);

  return {
    rules: rules.data ?? [],
    stages: stages.data ?? [],
    classrooms: classrooms.data ?? [],
    candidates,
    history: history.data ?? [],
  };
}

export async function savePromotionRule(
  supabase: Db,
  userId: string,
  input: {
    id?: string | null;
    from_stage_id: string | null;
    to_stage_id: string;
    min_age_months: number;
    notice_months: number;
    is_active?: boolean;
    sort_order?: number;
  },
) {
  await guard(supabase, userId, "seats");
  const payload = {
    from_stage_id: input.from_stage_id || null,
    to_stage_id: input.to_stage_id,
    min_age_months: Math.max(1, Math.round(input.min_age_months)),
    notice_months: Math.max(0, Math.round(input.notice_months)),
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
  };
  const query = input.id
    ? supabase.from("promotion_rules").update(payload).eq("id", input.id)
    : supabase.from("promotion_rules").insert(payload);
  const { error } = await query;
  if (error) throw new Error("تعذّر حفظ قاعدة النقل.");
  return { ok: true as const };
}

export async function deletePromotionRule(supabase: Db, userId: string, id: string) {
  await guard(supabase, userId, "seats");
  const { error } = await supabase.from("promotion_rules").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف قاعدة النقل.");
  return { ok: true as const };
}

/** Moves the child to the target stage (and classroom) and logs the transfer. */
export async function applyPromotion(
  supabase: Db,
  userId: string,
  input: { childId: string; toStageId: string; classroomId?: string | null; note?: string | null },
) {
  await guard(supabase, userId, "seats");

  const { data: child } = await supabase
    .from("application_children")
    .select("id, name_ar, birth_date, stage_id, classroom_id, application_id")
    .eq("id", input.childId)
    .maybeSingle();
  if (!child) throw new Error("لم يتم العثور على الطالب.");

  const { error } = await supabase
    .from("application_children")
    .update({
      stage_id: input.toStageId,
      classroom_id: input.classroomId ?? null,
    })
    .eq("id", input.childId);
  if (error) throw new Error("تعذّر نقل الطالب إلى المرحلة الجديدة.");

  const { error: logError } = await supabase.from("student_promotions").insert({
    child_id: input.childId,
    from_stage_id: child.stage_id,
    to_stage_id: input.toStageId,
    classroom_id: input.classroomId ?? null,
    status: "done",
    age_months: ageInMonths(child.birth_date),
    note: input.note?.slice(0, 500) ?? null,
    decided_by: userId,
  });
  if (logError) throw new Error("تم النقل لكن تعذّر تسجيل الحركة.");

  const { data: stage } = await supabase
    .from("stages")
    .select("name_ar")
    .eq("id", input.toStageId)
    .maybeSingle();
  const { data: app } = await supabase
    .from("applications")
    .select("parent_id")
    .eq("id", child.application_id)
    .maybeSingle();

  if (app?.parent_id) {
    await notify(supabase, {
      userIds: [app.parent_id],
      kind: "students.promoted",
      title: `تم نقل ${child.name_ar} إلى ${stage?.name_ar ?? "مرحلة جديدة"}`,
      body: "تم تحديث المرحلة الدراسية للطالب حسب العمر — يمكنك متابعة التفاصيل من ملف الطفل.",
      applicationId: child.application_id,
      link: "/child-file",
      severity: "info",
    });
  }

  return { ok: true as const };
}

/** Keeps the child where they are and stops flagging this transfer. */
export async function dismissPromotion(
  supabase: Db,
  userId: string,
  input: { childId: string; toStageId: string; note?: string | null },
) {
  await guard(supabase, userId, "seats");
  const { data: child } = await supabase
    .from("application_children")
    .select("id, stage_id, birth_date")
    .eq("id", input.childId)
    .maybeSingle();
  if (!child) throw new Error("لم يتم العثور على الطالب.");

  const { error } = await supabase.from("student_promotions").insert({
    child_id: input.childId,
    from_stage_id: child.stage_id,
    to_stage_id: input.toStageId,
    status: "dismissed",
    age_months: ageInMonths(child.birth_date),
    note: input.note?.slice(0, 500) ?? null,
    decided_by: userId,
  });
  if (error) throw new Error("تعذّر تجاهل التنبيه.");
  return { ok: true as const };
}

/** Notifies staff about every child who is overdue for a transfer. */
export async function notifyPromotionsDue(supabase: Db, userId: string) {
  await guard(supabase, userId, "seats");
  const { candidates, stages } = await listPromotions(supabase, userId);
  const ready = candidates.filter((c) => c.ready);
  if (!ready.length) return { sent: 0 };
  const stageName = (id: string) => stages.find((s) => s.id === id)?.name_ar ?? "مرحلة جديدة";
  await notify(supabase, {
    roles: ["admin", "principal", "registration_officer"],
    kind: "students.promotion_due",
    title: `${ready.length} طالبًا بلغوا سن الانتقال لمرحلة أعلى`,
    body: ready
      .slice(0, 6)
      .map((c) => `${c.name_ar} → ${stageName(c.toStageId)}`)
      .join(" · "),
    link: "/ams/students/promotions",
    severity: "warning",
  });
  return { sent: ready.length };
}
