/**
 * Server-only service for the Academic Tracking module.
 *
 * Every query runs as the signed-in user, so RLS decides which classrooms and
 * curriculum rows are reachable (staff → all, teacher → assigned classrooms,
 * parent → own child's classroom read-only).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import type { ClassroomOption, SubjectNode, TopicNode } from "./academics";

type Db = SupabaseClient<Database>;

const STAFF_ROLES: AppRole[] = [
  "admin",
  "supervisor",
  "principal",
  "registration_officer",
  "accountant",
];

async function rolesOf(supabase: Db, userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((row) => row.role as AppRole);
}

/** Classrooms the signed-in user may browse in the academic module. */
export async function listAccessibleClassrooms(
  supabase: Db,
  userId: string,
): Promise<{ roles: AppRole[]; classrooms: ClassroomOption[] }> {
  const roles = await rolesOf(supabase, userId);
  const isStaff = roles.some((r) => STAFF_ROLES.includes(r));

  let allowed: string[] | null = null;
  if (!isStaff) {
    const ids = new Set<string>();
    if (roles.includes("teacher")) {
      const { data } = await supabase
        .from("teacher_classrooms")
        .select("classroom_id")
        .eq("teacher_id", userId);
      for (const row of data ?? []) if (row.classroom_id) ids.add(row.classroom_id);
    }
    if (roles.includes("parent")) {
      const { data } = await supabase
        .from("application_children")
        .select("classroom_id, applications!inner(parent_id)")
        .eq("applications.parent_id", userId)
        .is("withdrawn_at", null);
      for (const row of (data ?? []) as { classroom_id: string | null }[]) {
        if (row.classroom_id) ids.add(row.classroom_id);
      }
    }
    allowed = [...ids];
    if (!allowed.length) return { roles, classrooms: [] };
  }

  let query = supabase
    .from("classrooms")
    .select("id, name_ar, color_hex, stage_id, stages(name_ar)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (allowed) query = query.in("id", allowed);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const classrooms: ClassroomOption[] = (
    (data ?? []) as unknown as {
      id: string;
      name_ar: string;
      color_hex: string;
      stage_id: string;
      stages: { name_ar: string } | null;
    }[]
  ).map((row) => ({
    id: row.id,
    nameAr: row.name_ar,
    colorHex: row.color_hex,
    stageId: row.stage_id,
    stageNameAr: row.stages?.name_ar ?? "—",
  }));

  return { roles, classrooms };
}

/** Full subject → topic → lesson tree for one classroom. */
export async function getCurriculumTree(supabase: Db, classroomId: string): Promise<SubjectNode[]> {
  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("id, classroom_id, name_ar, color_hex, sort_order, is_active")
    .eq("classroom_id", classroomId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!subjects?.length) return [];

  const subjectIds = subjects.map((s) => s.id);
  const { data: topics } = await supabase
    .from("topics")
    .select("id, subject_id, name_ar, sort_order, is_active")
    .in("subject_id", subjectIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const topicIds = (topics ?? []).map((t) => t.id);
  const { data: lessons } = topicIds.length
    ? await supabase
        .from("lessons")
        .select("id, topic_id, name_ar, description_ar, sort_order, is_active")
        .in("topic_id", topicIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] as never[] };

  const lessonsByTopic = new Map<string, SubjectNode["topics"][number]["lessons"]>();
  for (const lesson of lessons ?? []) {
    const list = lessonsByTopic.get(lesson.topic_id) ?? [];
    list.push({
      id: lesson.id,
      nameAr: lesson.name_ar,
      descriptionAr: lesson.description_ar,
      sortOrder: lesson.sort_order,
      isActive: lesson.is_active,
    });
    lessonsByTopic.set(lesson.topic_id, list);
  }

  const topicsBySubject = new Map<string, TopicNode[]>();
  for (const topic of topics ?? []) {
    const list = topicsBySubject.get(topic.subject_id) ?? [];
    list.push({
      id: topic.id,
      nameAr: topic.name_ar,
      sortOrder: topic.sort_order,
      isActive: topic.is_active,
      lessons: lessonsByTopic.get(topic.id) ?? [],
    });
    topicsBySubject.set(topic.subject_id, list);
  }

  return subjects.map((subject) => ({
    id: subject.id,
    classroomId: subject.classroom_id,
    nameAr: subject.name_ar,
    colorHex: subject.color_hex,
    sortOrder: subject.sort_order,
    isActive: subject.is_active,
    topics: topicsBySubject.get(subject.id) ?? [],
  }));
}

export type SubjectInput = {
  id?: string | null;
  classroomId: string;
  nameAr: string;
  colorHex: string;
  isActive: boolean;
};

export async function saveSubject(supabase: Db, userId: string, input: SubjectInput) {
  if (input.id) {
    const { error } = await supabase
      .from("subjects")
      .update({ name_ar: input.nameAr, color_hex: input.colorHex, is_active: input.isActive })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    return { id: input.id };
  }
  const { count } = await supabase
    .from("subjects")
    .select("id", { count: "exact", head: true })
    .eq("classroom_id", input.classroomId);
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      classroom_id: input.classroomId,
      name_ar: input.nameAr,
      color_hex: input.colorHex,
      is_active: input.isActive,
      sort_order: count ?? 0,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export type TopicInput = {
  id?: string | null;
  subjectId: string;
  nameAr: string;
  isActive: boolean;
};

export async function saveTopic(supabase: Db, userId: string, input: TopicInput) {
  if (input.id) {
    const { error } = await supabase
      .from("topics")
      .update({ name_ar: input.nameAr, is_active: input.isActive })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    return { id: input.id };
  }
  const { count } = await supabase
    .from("topics")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", input.subjectId);
  const { data, error } = await supabase
    .from("topics")
    .insert({
      subject_id: input.subjectId,
      name_ar: input.nameAr,
      is_active: input.isActive,
      sort_order: count ?? 0,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export type LessonInput = {
  id?: string | null;
  topicId: string;
  nameAr: string;
  descriptionAr?: string | null;
  isActive: boolean;
};

export async function saveLesson(supabase: Db, userId: string, input: LessonInput) {
  if (input.id) {
    const { error } = await supabase
      .from("lessons")
      .update({
        name_ar: input.nameAr,
        description_ar: input.descriptionAr ?? null,
        is_active: input.isActive,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    return { id: input.id };
  }
  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", input.topicId);
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      topic_id: input.topicId,
      name_ar: input.nameAr,
      description_ar: input.descriptionAr ?? null,
      is_active: input.isActive,
      sort_order: count ?? 0,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function deleteCurriculumNode(
  supabase: Db,
  kind: "subject" | "topic" | "lesson",
  id: string,
) {
  const table = kind === "subject" ? "subjects" : kind === "topic" ? "topics" : "lessons";
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ---------------------------------------------------------------------- */
/* Teacher assignments                                                     */
/* ---------------------------------------------------------------------- */

const SUPER_ADMIN_ROLES: AppRole[] = ["admin", "supervisor", "principal"];

async function assertSuperAdmin(supabase: Db, userId: string): Promise<AppRole[]> {
  const roles = await rolesOf(supabase, userId);
  if (!roles.some((r) => SUPER_ADMIN_ROLES.includes(r))) throw new Error("forbidden");
  return roles;
}

export type TeacherRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  classroomIds: string[];
};

export type AssignmentClassroom = {
  id: string;
  nameAr: string;
  colorHex: string;
  stageId: string;
  stageNameAr: string;
  capacity: number;
  enrolledCount: number;
  teacherIds: string[];
};

export type AssignmentBoard = {
  stages: { id: string; nameAr: string }[];
  teachers: TeacherRow[];
  classrooms: AssignmentClassroom[];
};

export async function getAssignmentBoard(supabase: Db, userId: string): Promise<AssignmentBoard> {
  await assertSuperAdmin(supabase, userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: roleRows }, { data: classrooms }, { data: links }, { data: children }] =
    await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "teacher"),
      supabase
        .from("classrooms")
        .select("id, name_ar, color_hex, capacity, stage_id, stages(name_ar, sort_order)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("teacher_classrooms").select("teacher_id, classroom_id"),
      supabase
        .from("application_children")
        .select("id, classroom_id, applications!inner(status, archived_at)")
        .is("withdrawn_at", null)
        .not("classroom_id", "is", null),
    ]);

  const teacherIds = [...new Set((roleRows ?? []).map((r) => r.user_id))];
  const { data: profiles } = teacherIds.length
    ? await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", teacherIds)
    : { data: [] as { id: string; full_name: string; email: string | null; phone: string | null }[] };

  const linkRows = (links ?? []) as { teacher_id: string; classroom_id: string }[];
  const byTeacher = new Map<string, string[]>();
  const byClassroom = new Map<string, string[]>();
  for (const row of linkRows) {
    byTeacher.set(row.teacher_id, [...(byTeacher.get(row.teacher_id) ?? []), row.classroom_id]);
    byClassroom.set(row.classroom_id, [
      ...(byClassroom.get(row.classroom_id) ?? []),
      row.teacher_id,
    ]);
  }

  const ACTIVE = new Set(["approved", "submitted", "under_review", "principal_review"]);
  const enrolled = new Map<string, number>();
  for (const row of (children ?? []) as unknown as {
    classroom_id: string;
    applications: { status: string; archived_at: string | null } | null;
  }[]) {
    const app = row.applications;
    if (!app || app.archived_at || !ACTIVE.has(app.status)) continue;
    enrolled.set(row.classroom_id, (enrolled.get(row.classroom_id) ?? 0) + 1);
  }

  const rooms = (
    (classrooms ?? []) as unknown as {
      id: string;
      name_ar: string;
      color_hex: string;
      capacity: number;
      stage_id: string;
      stages: { name_ar: string; sort_order: number } | null;
    }[]
  ).map((row) => ({
    id: row.id,
    nameAr: row.name_ar,
    colorHex: row.color_hex,
    stageId: row.stage_id,
    stageNameAr: row.stages?.name_ar ?? "—",
    capacity: row.capacity,
    enrolledCount: enrolled.get(row.id) ?? 0,
    teacherIds: byClassroom.get(row.id) ?? [],
  }));

  const stages = [...new Map(rooms.map((r) => [r.stageId, r.stageNameAr])).entries()].map(
    ([id, nameAr]) => ({ id, nameAr }),
  );

  const teachers: TeacherRow[] = (profiles ?? []).map((row) => ({
    id: row.id,
    fullName: (row.full_name || "").trim() || row.email || "معلمة",
    email: row.email,
    phone: row.phone,
    classroomIds: byTeacher.get(row.id) ?? [],
  }));
  teachers.sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));

  return { stages, teachers, classrooms: rooms };
}

/**
 * Mirror the real teacher assignments onto `classrooms.teacher_name` (and the
 * extra-teachers JSON) so Student Affairs classroom settings and the public
 * website always show the same names as the Academic Tracking assignment board.
 * Assignments are the single source of truth; no duplicate manual entry.
 */
async function syncClassroomTeacherNames(classroomIds: string[]) {
  const ids = [...new Set(classroomIds)].filter(Boolean);
  if (!ids.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");


  const { data: links } = await supabaseAdmin
    .from("teacher_classrooms")
    .select("teacher_id, classroom_id, created_at")
    .in("classroom_id", ids)
    .order("created_at", { ascending: true });

  const teacherIds = [...new Set((links ?? []).map((l) => l.teacher_id))];
  const { data: profiles } = teacherIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", teacherIds)
    : { data: [] as { id: string; full_name: string; email: string | null }[] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, (p.full_name || "").trim() || p.email || "معلمة"]),
  );

  const { data: rooms } = await supabaseAdmin
    .from("classrooms")
    .select("id, teachers")
    .in("id", ids);

  for (const id of ids) {
    const names = (links ?? [])
      .filter((l) => l.classroom_id === id)
      .map((l) => nameById.get(l.teacher_id))
      .filter((n): n is string => !!n);

    const existing = Array.isArray(rooms?.find((r) => r.id === id)?.teachers)
      ? ((rooms?.find((r) => r.id === id)?.teachers ?? []) as { name?: string }[])
      : [];
    const metaByName = new Map(existing.map((t) => [(t.name ?? "").trim(), t]));

    const extras = names.slice(1).map((name) => ({
      title: "معلمة الفصل",
      ...(metaByName.get(name) ?? {}),
      name,
    }));

    await supabaseAdmin
      .from("classrooms")
      .update({ teacher_name: names[0] ?? null, teachers: extras })
      .eq("id", id);
  }
}

/** Replace the full teacher list of one classroom. */
export async function setClassroomTeachers(
  supabase: Db,
  userId: string,
  classroomId: string,
  teacherIds: string[],
) {
  await assertSuperAdmin(supabase, userId);
  const unique = [...new Set(teacherIds)];

  const { error: delError } = await supabase
    .from("teacher_classrooms")
    .delete()
    .eq("classroom_id", classroomId);
  if (delError) throw new Error(delError.message);

  if (unique.length) {
    const { error } = await supabase.from("teacher_classrooms").insert(
      unique.map((teacherId) => ({
        teacher_id: teacherId,
        classroom_id: classroomId,
        created_by: userId,
      })),
    );
    if (error) throw new Error(error.message);
  }
  await syncClassroomTeacherNames([classroomId]);
  return { ok: true, count: unique.length };
}

/** Replace the full classroom list of one teacher. */
export async function setTeacherClassrooms(
  supabase: Db,
  userId: string,
  teacherId: string,
  classroomIds: string[],
) {
  await assertSuperAdmin(supabase, userId);
  const unique = [...new Set(classroomIds)];

  const { data: previous } = await supabase
    .from("teacher_classrooms")
    .select("classroom_id")
    .eq("teacher_id", teacherId);

  const { error: delError } = await supabase
    .from("teacher_classrooms")
    .delete()
    .eq("teacher_id", teacherId);
  if (delError) throw new Error(delError.message);

  if (unique.length) {
    const { error } = await supabase.from("teacher_classrooms").insert(
      unique.map((classroomId) => ({
        teacher_id: teacherId,
        classroom_id: classroomId,
        created_by: userId,
      })),
    );
    if (error) throw new Error(error.message);
  }
  await syncClassroomTeacherNames([
    ...unique,
    ...((previous ?? []).map((r) => r.classroom_id) as string[]),
  ]);
  return { ok: true, count: unique.length };
}

/* ---------------------------------------------------------------------- */
/* Copy curriculum between classrooms                                      */
/* ---------------------------------------------------------------------- */

export type CopyCurriculumInput = {
  sourceClassroomId: string;
  targetClassroomIds: string[];
  subjectIds: string[];
  /** "merge" reuses same-named subjects/topics, "duplicate" always creates new. */
  mode: "merge" | "duplicate";
};

export type CopyCurriculumResult = {
  classrooms: number;
  subjects: number;
  topics: number;
  lessons: number;
  skipped: number;
};

/**
 * Copies selected subjects (with their topics and lessons) from one classroom
 * to one or more classrooms. In "merge" mode existing names are reused instead
 * of duplicated, so the action is safe to run repeatedly.
 */
export async function copyCurriculum(
  supabase: Db,
  userId: string,
  input: CopyCurriculumInput,
): Promise<CopyCurriculumResult> {
  const tree = await getCurriculumTree(supabase, input.sourceClassroomId);
  const selected = input.subjectIds.length
    ? tree.filter((s) => input.subjectIds.includes(s.id))
    : tree;
  const targets = input.targetClassroomIds.filter((id) => id !== input.sourceClassroomId);
  if (!selected.length || !targets.length) {
    return { classrooms: 0, subjects: 0, topics: 0, lessons: 0, skipped: 0 };
  }

  const result: CopyCurriculumResult = {
    classrooms: targets.length,
    subjects: 0,
    topics: 0,
    lessons: 0,
    skipped: 0,
  };

  const norm = (value: string) => value.trim().replace(/\s+/g, " ");

  for (const classroomId of targets) {
    const existing = input.mode === "merge" ? await getCurriculumTree(supabase, classroomId) : [];
    let subjectOrder = existing.length;

    for (const subject of selected) {
      let targetSubject = existing.find((s) => norm(s.nameAr) === norm(subject.nameAr));

      let targetSubjectId: string;
      if (targetSubject) {
        targetSubjectId = targetSubject.id;
        result.skipped += 1;
      } else {
        const { data, error } = await supabase
          .from("subjects")
          .insert({
            classroom_id: classroomId,
            name_ar: subject.nameAr,
            color_hex: subject.colorHex,
            is_active: subject.isActive,
            sort_order: subjectOrder++,
            created_by: userId,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        targetSubjectId = data.id;
        result.subjects += 1;
      }

      let topicOrder = targetSubject?.topics.length ?? 0;
      for (const topic of subject.topics) {
        const existingTopic = targetSubject?.topics.find(
          (t) => norm(t.nameAr) === norm(topic.nameAr),
        );

        let targetTopicId: string;
        if (existingTopic) {
          targetTopicId = existingTopic.id;
        } else {
          const { data, error } = await supabase
            .from("topics")
            .insert({
              subject_id: targetSubjectId,
              name_ar: topic.nameAr,
              is_active: topic.isActive,
              sort_order: topicOrder++,
              created_by: userId,
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          targetTopicId = data.id;
          result.topics += 1;
        }

        const existingLessonNames = new Set(
          (existingTopic?.lessons ?? []).map((l) => norm(l.nameAr)),
        );
        let lessonOrder = existingTopic?.lessons.length ?? 0;
        const rows = topic.lessons
          .filter((lesson) => !existingLessonNames.has(norm(lesson.nameAr)))
          .map((lesson) => ({
            topic_id: targetTopicId,
            name_ar: lesson.nameAr,
            description_ar: lesson.descriptionAr ?? null,
            is_active: lesson.isActive,
            sort_order: lessonOrder++,
            created_by: userId,
          }));
        if (rows.length) {
          const { error } = await supabase.from("lessons").insert(rows);
          if (error) throw new Error(error.message);
          result.lessons += rows.length;
        }
      }
    }
  }

  return result;
}
