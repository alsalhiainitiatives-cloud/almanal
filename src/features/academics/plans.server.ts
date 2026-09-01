/**
 * Server-only service for the "Study Plans" module.
 *
 * Every query runs as the signed-in user, so row-level security decides which
 * classrooms and plans are reachable: staff and assigned teachers read/write,
 * parents only read published plans for their children's classrooms.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { PlanType, StudyPlan, StudyPlanItem } from "./plans";

type Db = SupabaseClient<Database>;

type PlanRow = Database["public"]["Tables"]["study_plans"]["Row"] & {
  classrooms?: { name_ar: string; stages: { name_ar: string } | null } | null;
};

function mapItem(row: Database["public"]["Tables"]["study_plan_items"]["Row"]): StudyPlanItem {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    lessonNameAr: row.lesson_name_ar ?? "درس",
    subjectNameAr: row.subject_name_ar,
    colorHex: row.color_hex,
    scheduledDay: row.scheduled_day ?? 0,
    scheduledTime: row.scheduled_time,
    durationMinutes: row.duration_minutes,
    notes: row.notes,
    sortOrder: row.sort_order,
  };
}

function mapPlan(row: PlanRow, items: StudyPlanItem[]): StudyPlan {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    classroomName: row.classrooms?.name_ar ?? null,
    stageName: row.classrooms?.stages?.name_ar ?? null,
    planType: (row.plan_type as PlanType) ?? "weekly",
    titleAr: row.title_ar,
    notes: row.notes,
    startDate: row.start_date,
    endDate: row.end_date,
    published: row.published,
    createdAt: row.created_at,
    items: items.sort((a, b) =>
      a.scheduledDay - b.scheduledDay || a.sortOrder - b.sortOrder,
    ),
  };
}

async function withItems(supabase: Db, rows: PlanRow[]): Promise<StudyPlan[]> {
  if (!rows.length) return [];
  const { data: items } = await supabase
    .from("study_plan_items")
    .select("*")
    .in(
      "plan_id",
      rows.map((r) => r.id),
    )
    .order("sort_order");

  const byPlan = new Map<string, StudyPlanItem[]>();
  for (const row of items ?? []) {
    byPlan.set(row.plan_id, [...(byPlan.get(row.plan_id) ?? []), mapItem(row)]);
  }
  return rows.map((r) => mapPlan(r, byPlan.get(r.id) ?? []));
}

const PLAN_SELECT = "*, classrooms (name_ar, stages (name_ar))";

/** Plans for one classroom (teacher / staff builder view). */
export async function listClassroomPlans(supabase: Db, classroomId: string): Promise<StudyPlan[]> {
  const { data } = await supabase
    .from("study_plans")
    .select(PLAN_SELECT)
    .eq("classroom_id", classroomId)
    .order("start_date", { ascending: false })
    .limit(60);
  return withItems(supabase, (data ?? []) as unknown as PlanRow[]);
}

export type SavePlanInput = {
  id?: string | null;
  classroomId: string;
  planType: PlanType;
  titleAr?: string | null;
  notes?: string | null;
  startDate: string;
  endDate: string;
  published?: boolean;
  items: {
    lessonId?: string | null;
    lessonNameAr: string;
    subjectNameAr?: string | null;
    colorHex?: string;
    scheduledDay: number;
    scheduledTime?: string | null;
    durationMinutes?: number | null;
    notes?: string | null;
  }[];
};

/** Creates or updates a plan and replaces its items in one shot. */
export async function saveStudyPlan(supabase: Db, userId: string, input: SavePlanInput) {
  const payload = {
    classroom_id: input.classroomId,
    plan_type: input.planType,
    title_ar: input.titleAr?.trim() || null,
    notes: input.notes?.trim() || null,
    start_date: input.startDate,
    end_date: input.endDate,
    published: input.published ?? false,
    created_by: userId,
  };

  let planId = input.id ?? null;
  if (planId) {
    const { error } = await supabase.from("study_plans").update(payload).eq("id", planId);
    if (error) throw new Error("تعذّر تحديث الخطة — تأكد من صلاحيتك على هذا الفصل.");
    await supabase.from("study_plan_items").delete().eq("plan_id", planId);
  } else {
    const { data, error } = await supabase
      .from("study_plans")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error("تعذّر إنشاء الخطة — تأكد من صلاحيتك على هذا الفصل.");
    planId = data.id;
  }

  const rows = input.items.slice(0, 200).map((item, index) => ({
    plan_id: planId!,
    lesson_id: item.lessonId ?? null,
    lesson_name_ar: item.lessonNameAr.slice(0, 200),
    subject_name_ar: item.subjectNameAr ?? null,
    color_hex: item.colorHex ?? "#7A1F3D",
    scheduled_day: Math.min(Math.max(item.scheduledDay, 0), 4),
    scheduled_time: item.scheduledTime ?? null,
    duration_minutes: item.durationMinutes ?? null,
    notes: item.notes?.slice(0, 600) ?? null,
    sort_order: index,
  }));

  if (rows.length) {
    const { error } = await supabase.from("study_plan_items").insert(rows);
    if (error) throw new Error("تعذّر حفظ عناصر الخطة.");
  }

  if (payload.published) await notifyPlanPublished(supabase, planId!);

  return { id: planId! };
}

/** Tells parents of the classroom that a plan is now available in their portal. */
async function notifyPlanPublished(supabase: Db, planId: string) {
  try {
    const { classroomAudience, notify } = await import(
      "@/features/notifications/notifications.server"
    );
    const { data: plan } = await supabase
      .from("study_plans")
      .select("title_ar, plan_type, start_date, classroom_id, classrooms (name_ar)")
      .eq("id", planId)
      .maybeSingle();
    if (!plan?.classroom_id) return;
    const classroomName =
      (plan as unknown as { classrooms: { name_ar: string } | null }).classrooms?.name_ar ?? "فصل طفلك";
    const { parentIds } = await classroomAudience(plan.classroom_id);
    await notify(supabase, {
      userIds: parentIds,
      kind: "study_plan",
      title: `تم نشر ${plan.plan_type === "monthly" ? "الخطة الشهرية" : "الخطة الأسبوعية"} — ${classroomName}`,
      body: `${plan.title_ar ?? "الخطة الدراسية"} — تبدأ من ${plan.start_date}. يمكنك استعراضها الآن من «خطة طفلي الدراسية».`,
      link: "/study-plans",
      severity: "success",
    });
  } catch (error) {
    console.error("plan notify failed", error);
  }
}

export async function deleteStudyPlan(supabase: Db, id: string) {
  const { error } = await supabase.from("study_plans").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف الخطة.");
  return { ok: true };
}

export async function setStudyPlanPublished(supabase: Db, id: string, published: boolean) {
  const { error } = await supabase.from("study_plans").update({ published }).eq("id", id);
  if (error) throw new Error("تعذّر تحديث حالة النشر.");
  if (published) await notifyPlanPublished(supabase, id);
  return { ok: true };
}


export type ParentPlanChild = {
  childId: string;
  childName: string;
  classroomId: string;
  classroomName: string | null;
  stageName: string | null;
};

export type ParentPlanBoard = {
  children: ParentPlanChild[];
  plans: StudyPlan[];
};

/** Read-only board for the parent portal: one entry per enrolled child. */
export async function getParentPlanBoard(supabase: Db, userId: string): Promise<ParentPlanBoard> {
  const { data: kids } = await supabase
    .from("application_children")
    .select("id, name_ar, classroom_id, classrooms (name_ar, stages (name_ar)), applications!inner (parent_id, status)")
    .eq("applications.parent_id", userId)
    .eq("applications.status", "approved")
    .order("name_ar")
    .limit(50);

  const children: ParentPlanChild[] = ((kids ?? []) as unknown as {
    id: string;
    name_ar: string;
    classroom_id: string | null;
    classrooms: { name_ar: string; stages: { name_ar: string } | null } | null;
  }[])
    .filter((k) => Boolean(k.classroom_id))
    .map((k) => ({
      childId: k.id,
      childName: k.name_ar,
      classroomId: k.classroom_id as string,
      classroomName: k.classrooms?.name_ar ?? null,
      stageName: k.classrooms?.stages?.name_ar ?? null,
    }));

  const ids = [...new Set(children.map((c) => c.classroomId))];
  if (!ids.length) return { children, plans: [] };

  const { data } = await supabase
    .from("study_plans")
    .select(PLAN_SELECT)
    .in("classroom_id", ids)
    .eq("published", true)
    .order("start_date", { ascending: false })
    .limit(120);

  return { children, plans: await withItems(supabase, (data ?? []) as unknown as PlanRow[]) };
}
