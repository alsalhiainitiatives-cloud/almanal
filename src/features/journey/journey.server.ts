/**
 * Server-only service for the "Child Academic Journey" module.
 *
 * Runs as the signed-in user (RLS applies). Teachers only reach their own
 * classrooms, parents only their own children; the service-role client is used
 * strictly for signing evidence URLs and for admin-side teacher assignment.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { EVIDENCE_BUCKET, EVIDENCE_LIMITS_MB, type EvidenceKind } from "./journey";

type Db = SupabaseClient<Database>;

const STAFF_ROLES: AppRole[] = ["registration_officer", "principal", "supervisor", "admin"];

async function rolesOf(supabase: Db, userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

function isStaff(roles: AppRole[]) {
  return roles.some((r) => STAFF_ROLES.includes(r));
}

function isTeacher(roles: AppRole[]) {
  return roles.includes("teacher");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

export type EvidenceRow = {
  id: string;
  filePath: string;
  fileType: EvidenceKind;
  fileName: string | null;
  url: string | null;
};

export type SkillRow = {
  id: string;
  childId: string;
  skillName: string;
  domain: string | null;
  completion: number;
  improvement: number;
  note: string | null;
  observedAt: string;
  createdAt: string;
  evidences: EvidenceRow[];
};

export type PlanRow = {
  id: string;
  classroomId: string;
  weekStart: string;
  title: string;
  subject: string | null;
  lessons: string | null;
  activities: string | null;
  notes: string | null;
  status: string;
};

async function signEvidence(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const db = await admin();
  const { data } = await db.storage.from(EVIDENCE_BUCKET).createSignedUrls(unique, 60 * 60 * 6);
  const map: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  return map;
}

type RawSkill = {
  id: string;
  child_id: string;
  skill_name: string;
  domain_ar: string | null;
  completion_percentage: number;
  improvement_percentage: number;
  note_ar: string | null;
  observed_at: string;
  created_at: string;
  skill_evidences: {
    id: string;
    file_path: string;
    file_type: string;
    file_name: string | null;
  }[] | null;
};

async function mapSkills(rows: RawSkill[]): Promise<SkillRow[]> {
  const urls = await signEvidence(rows.flatMap((r) => (r.skill_evidences ?? []).map((e) => e.file_path)));
  return rows.map((r) => ({
    id: r.id,
    childId: r.child_id,
    skillName: r.skill_name,
    domain: r.domain_ar,
    completion: r.completion_percentage,
    improvement: r.improvement_percentage,
    note: r.note_ar,
    observedAt: r.observed_at,
    createdAt: r.created_at,
    evidences: (r.skill_evidences ?? []).map((e) => ({
      id: e.id,
      filePath: e.file_path,
      fileType: e.file_type as EvidenceKind,
      fileName: e.file_name,
      url: urls[e.file_path] ?? null,
    })),
  }));
}

const SKILL_SELECT =
  "id, child_id, skill_name, domain_ar, completion_percentage, improvement_percentage, note_ar, observed_at, created_at, skill_evidences (id, file_path, file_type, file_name)";

/** Teacher / staff hub: classrooms in scope, weekly plans, children, observations. */
export async function getTeacherHub(supabase: Db, userId: string, input: { classroomId?: string | null }) {
  const roles = await rolesOf(supabase, userId);
  const staff = isStaff(roles);
  if (!staff && !isTeacher(roles)) {
    throw new Error("هذا القسم متاح للمعلمات وإدارة المدرسة فقط.");
  }

  let classrooms: { id: string; name_ar: string; stage_id: string }[] = [];
  if (staff) {
    const { data } = await supabase
      .from("classrooms")
      .select("id, name_ar, stage_id")
      .eq("is_active", true)
      .order("sort_order");
    classrooms = data ?? [];
  } else {
    const { data } = await supabase
      .from("teacher_classrooms")
      .select("classrooms (id, name_ar, stage_id)")
      .eq("teacher_id", userId);
    classrooms = (data ?? [])
      .map((r) => r.classrooms as unknown as { id: string; name_ar: string; stage_id: string } | null)
      .filter((c): c is { id: string; name_ar: string; stage_id: string } => Boolean(c));
  }

  const selected = input.classroomId && classrooms.some((c) => c.id === input.classroomId)
    ? input.classroomId
    : (classrooms[0]?.id ?? null);

  if (!selected) {
    return { canManage: true, isStaff: staff, classrooms, selected: null, plans: [], children: [], skills: [] };
  }

  const [{ data: plans }, { data: children }] = await Promise.all([
    supabase
      .from("weekly_plans")
      .select("id, classroom_id, week_start_date, title_ar, subject_ar, lessons_ar, activities_ar, notes_ar, status")
      .eq("classroom_id", selected)
      .order("week_start_date", { ascending: false })
      .limit(40),
    supabase
      .from("application_children")
      .select("id, name_ar, gender, birth_date, applications!inner (status)")
      .eq("classroom_id", selected)
      .eq("applications.status", "approved")
      .order("name_ar")
      .limit(200),
  ]);

  const childIds = (children ?? []).map((c) => c.id);
  const { data: skillRows } = childIds.length
    ? await supabase
        .from("student_skills_tracking")
        .select(SKILL_SELECT)
        .in("child_id", childIds)
        .order("observed_at", { ascending: false })
        .limit(400)
    : { data: [] as RawSkill[] };

  return {
    canManage: true,
    isStaff: staff,
    classrooms,
    selected,
    plans: (plans ?? []).map(
      (p): PlanRow => ({
        id: p.id,
        classroomId: p.classroom_id,
        weekStart: p.week_start_date,
        title: p.title_ar,
        subject: p.subject_ar,
        lessons: p.lessons_ar,
        activities: p.activities_ar,
        notes: p.notes_ar,
        status: p.status,
      }),
    ),
    children: (children ?? []).map((c) => ({
      id: c.id,
      name: c.name_ar,
      gender: c.gender,
      birthDate: c.birth_date,
    })),
    skills: await mapSkills((skillRows ?? []) as unknown as RawSkill[]),
  };
}

/** Parent view: each child with the classroom weekly plans and their portfolio. */
export async function getParentJourney(supabase: Db, userId: string) {
  const { data: children } = await supabase
    .from("application_children")
    .select("id, name_ar, birth_date, photo_url, classroom_id, applications!inner (parent_id, status)")
    .eq("applications.parent_id", userId)
    .eq("applications.status", "approved")
    .order("name_ar")
    .limit(50);

  const rows = children ?? [];
  const classroomIds = [...new Set(rows.map((r) => r.classroom_id).filter((v): v is string => Boolean(v)))];

  const [{ data: classrooms }, { data: plans }] = await Promise.all([
    classroomIds.length
      ? supabase.from("classrooms").select("id, name_ar, teacher_name, color_hex").in("id", classroomIds)
      : Promise.resolve({ data: [] as { id: string; name_ar: string; teacher_name: string | null; color_hex: string }[] }),
    classroomIds.length
      ? supabase
          .from("weekly_plans")
          .select("id, classroom_id, week_start_date, title_ar, subject_ar, lessons_ar, activities_ar, notes_ar, status")
          .in("classroom_id", classroomIds)
          .eq("status", "published")
          .order("week_start_date", { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const childIds = rows.map((r) => r.id);
  const { data: skillRows } = childIds.length
    ? await supabase
        .from("student_skills_tracking")
        .select(SKILL_SELECT)
        .in("child_id", childIds)
        .order("observed_at", { ascending: false })
        .limit(300)
    : { data: [] as RawSkill[] };

  const roomById = new Map((classrooms ?? []).map((c) => [c.id, c]));

  return {
    children: rows.map((r) => ({
      id: r.id,
      name: r.name_ar,
      birthDate: r.birth_date,
      classroomId: r.classroom_id,
      classroomName: r.classroom_id ? (roomById.get(r.classroom_id)?.name_ar ?? null) : null,
      teacherName: r.classroom_id ? (roomById.get(r.classroom_id)?.teacher_name ?? null) : null,
      colorHex: r.classroom_id ? (roomById.get(r.classroom_id)?.color_hex ?? null) : null,
    })),
    plans: ((plans ?? []) as unknown as {
      id: string;
      classroom_id: string;
      week_start_date: string;
      title_ar: string;
      subject_ar: string | null;
      lessons_ar: string | null;
      activities_ar: string | null;
      notes_ar: string | null;
      status: string;
    }[]).map(
      (p): PlanRow => ({
        id: p.id,
        classroomId: p.classroom_id,
        weekStart: p.week_start_date,
        title: p.title_ar,
        subject: p.subject_ar,
        lessons: p.lessons_ar,
        activities: p.activities_ar,
        notes: p.notes_ar,
        status: p.status,
      }),
    ),
    skills: await mapSkills((skillRows ?? []) as unknown as RawSkill[]),
  };
}

export type PlanInput = {
  id?: string | null;
  classroomId: string;
  weekStart: string;
  title: string;
  subject?: string | null;
  lessons?: string | null;
  activities?: string | null;
  notes?: string | null;
  status: "draft" | "published";
};

export async function savePlan(supabase: Db, userId: string, input: PlanInput) {
  const payload = {
    classroom_id: input.classroomId,
    week_start_date: input.weekStart,
    title_ar: input.title.trim(),
    subject_ar: input.subject?.trim() || null,
    lessons_ar: input.lessons?.trim() || null,
    activities_ar: input.activities?.trim() || null,
    notes_ar: input.notes?.trim() || null,
    status: input.status,
    created_by: userId,
  };
  const query = input.id
    ? supabase.from("weekly_plans").update(payload).eq("id", input.id)
    : supabase.from("weekly_plans").insert(payload);
  const { error } = await query;
  if (error) throw new Error("تعذّر حفظ الخطة الأسبوعية — تأكد من صلاحيتك على هذا الفصل.");
  return { ok: true };
}

export async function deletePlan(supabase: Db, _userId: string, id: string) {
  const { error } = await supabase.from("weekly_plans").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف الخطة الأسبوعية.");
  return { ok: true };
}

export type SkillInput = {
  id?: string | null;
  childId: string;
  classroomId?: string | null;
  skillName: string;
  domain?: string | null;
  completion: number;
  improvement: number;
  note?: string | null;
  observedAt: string;
};

export async function saveSkill(supabase: Db, userId: string, input: SkillInput) {
  const payload = {
    child_id: input.childId,
    classroom_id: input.classroomId ?? null,
    skill_name: input.skillName.trim(),
    domain_ar: input.domain?.trim() || null,
    completion_percentage: Math.min(100, Math.max(0, Math.round(input.completion))),
    improvement_percentage: Math.min(100, Math.max(0, Math.round(input.improvement))),
    note_ar: input.note?.trim() || null,
    observed_at: input.observedAt,
    created_by: userId,
  };
  if (input.id) {
    const { error } = await supabase.from("student_skills_tracking").update(payload).eq("id", input.id);
    if (error) throw new Error("تعذّر تحديث رصد المهارة.");
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabase
    .from("student_skills_tracking")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error("تعذّر حفظ رصد المهارة — تأكد من أن الطفل ضمن فصولك.");
  return { ok: true, id: data.id };
}

export async function deleteSkill(supabase: Db, _userId: string, id: string) {
  const { data: files } = await supabase.from("skill_evidences").select("file_path").eq("tracking_id", id);
  const { error } = await supabase.from("student_skills_tracking").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف رصد المهارة.");
  const paths = (files ?? []).map((f) => f.file_path);
  if (paths.length) {
    const db = await admin();
    await db.storage.from(EVIDENCE_BUCKET).remove(paths);
  }
  return { ok: true };
}

export async function addEvidence(
  supabase: Db,
  userId: string,
  input: { trackingId: string; filePath: string; fileType: EvidenceKind; fileName?: string | null; fileSize?: number | null },
) {
  const limit = EVIDENCE_LIMITS_MB[input.fileType] * 1024 * 1024;
  if ((input.fileSize ?? 0) > limit) {
    throw new Error(`حجم الملف يتجاوز الحد المسموح (${EVIDENCE_LIMITS_MB[input.fileType]} م.ب).`);
  }
  const { error } = await supabase.from("skill_evidences").insert({
    tracking_id: input.trackingId,
    file_path: input.filePath,
    file_type: input.fileType,
    file_name: input.fileName ?? null,
    file_size: input.fileSize ?? null,
    created_by: userId,
  });
  if (error) throw new Error("تعذّر ربط الدليل الرقمي بالمهارة.");
  return { ok: true };
}

export async function deleteEvidence(supabase: Db, _userId: string, id: string) {
  const { data: row } = await supabase.from("skill_evidences").select("file_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("skill_evidences").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف الدليل الرقمي.");
  if (row?.file_path) {
    const db = await admin();
    await db.storage.from(EVIDENCE_BUCKET).remove([row.file_path]);
  }
  return { ok: true };
}

async function guardAdmin(supabase: Db, userId: string) {
  const roles = await rolesOf(supabase, userId);
  if (!roles.includes("admin") && !roles.includes("supervisor") && !roles.includes("principal")) {
    throw new Error("إدارة تكليف المعلمات متاحة لمدير النظام ومدير المدرسة فقط.");
  }
}

/** Admin-side: teacher accounts, their classroom assignments, and all classrooms. */
export async function listTeacherAssignments(supabase: Db, userId: string) {
  await guardAdmin(supabase, userId);
  const db = await admin();
  const [{ data: teacherRoles }, { data: assignments }, { data: classrooms }] = await Promise.all([
    db.from("user_roles").select("user_id").eq("role", "teacher"),
    db.from("teacher_classrooms").select("id, teacher_id, classroom_id"),
    db.from("classrooms").select("id, name_ar").eq("is_active", true).order("sort_order"),
  ]);
  const ids = [...new Set((teacherRoles ?? []).map((r) => r.user_id))];
  const { data: profiles } = ids.length
    ? await db.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string; email: string | null }[] };

  return {
    teachers: (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
      classroomIds: (assignments ?? []).filter((a) => a.teacher_id === p.id).map((a) => a.classroom_id),
    })),
    classrooms: classrooms ?? [],
  };
}

export async function setTeacherClassrooms(
  supabase: Db,
  userId: string,
  input: { teacherId: string; classroomIds: string[] },
) {
  await guardAdmin(supabase, userId);
  const db = await admin();
  await db.from("teacher_classrooms").delete().eq("teacher_id", input.teacherId);
  if (input.classroomIds.length) {
    const { error } = await db.from("teacher_classrooms").insert(
      input.classroomIds.map((classroom_id) => ({
        teacher_id: input.teacherId,
        classroom_id,
        created_by: userId,
      })),
    );
    if (error) throw new Error("تعذّر حفظ تكليف الفصول.");
  }
  return { ok: true };
}