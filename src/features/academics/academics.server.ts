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
        .eq("applications.parent_id", userId);
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
