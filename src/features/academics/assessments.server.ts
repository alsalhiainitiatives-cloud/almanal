/**
 * Server-only service for the "Assessments" module.
 *
 * Runs as the signed-in user so RLS decides scope: staff reach every classroom,
 * a teacher only the classrooms she is assigned to (and only children enrolled
 * in them). The service-role client is used strictly to sign evidence URLs.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import {
  ASSESSMENT_BUCKET,
  normalizeColors,
  type AssessmentBoard,
  type AssessmentCell,
  type AssessmentLesson,
  type EvidenceFileKind,
  type TriangleLevel,
} from "./assessments";

type Db = SupabaseClient<Database>;

const STAFF_ROLES: AppRole[] = [
  "registration_officer",
  "accountant",
  "principal",
  "supervisor",
  "admin",
];

async function rolesOf(supabase: Db, userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

async function signEvidence(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from(ASSESSMENT_BUCKET)
    .createSignedUrls(unique, 60 * 60 * 6);
  const map: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  return map;
}

/** Classrooms + lessons + enrolled children + saved evaluations for one classroom. */
export async function getAssessmentBoard(
  supabase: Db,
  userId: string,
  input: { classroomId?: string | null },
): Promise<AssessmentBoard> {
  const roles = await rolesOf(supabase, userId);
  const staff = roles.some((r) => STAFF_ROLES.includes(r));
  const teacher = roles.includes("teacher");
  if (!staff && !teacher) throw new Error("هذا القسم متاح للمعلمات وإدارة المدرسة فقط.");

  let classrooms: { id: string; name_ar: string; stages: { name_ar: string } | null }[] = [];
  if (staff) {
    const { data } = await supabase
      .from("classrooms")
      .select("id, name_ar, stages(name_ar)")
      .eq("is_active", true)
      .order("sort_order");
    classrooms = (data ?? []) as never;
  } else {
    const { data: links } = await supabase
      .from("teacher_classrooms")
      .select("classroom_id")
      .eq("teacher_id", userId);
    const ids = [...new Set((links ?? []).map((l) => l.classroom_id).filter(Boolean))];
    if (ids.length) {
      const { data } = await supabase
        .from("classrooms")
        .select("id, name_ar, stages(name_ar)")
        .in("id", ids)
        .eq("is_active", true)
        .order("sort_order");
      classrooms = (data ?? []) as never;
    }
  }

  const options = classrooms.map((c) => ({
    id: c.id,
    nameAr: c.name_ar,
    stageNameAr: c.stages?.name_ar ?? "—",
  }));

  const selected =
    input.classroomId && options.some((o) => o.id === input.classroomId)
      ? input.classroomId
      : (options[0]?.id ?? null);

  const empty: AssessmentBoard = {
    canEdit: true,
    classrooms: options,
    selectedClassroomId: selected,
    lessons: [],
    children: [],
    cells: [],
  };
  if (!selected) return empty;

  const [{ data: subjects }, childrenResult] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name_ar, color_hex, sort_order, is_active")
      .eq("classroom_id", selected)
      .eq("is_active", true)
      .order("sort_order"),
    supabase.rpc("classroom_enrolled_children", { _classroom_id: selected }),
  ]);
  if (childrenResult.error) throw new Error(childrenResult.error.message);
  const children = childrenResult.data;

  const subjectRows = subjects ?? [];
  const { data: topics } = subjectRows.length
    ? await supabase
        .from("topics")
        .select("id, subject_id, name_ar, sort_order")
        .in(
          "subject_id",
          subjectRows.map((s) => s.id),
        )
        .eq("is_active", true)
        .order("sort_order")
    : { data: [] as { id: string; subject_id: string; name_ar: string; sort_order: number }[] };

  const topicRows = topics ?? [];
  const { data: lessonRows } = topicRows.length
    ? await supabase
        .from("lessons")
        .select("id, topic_id, name_ar, sort_order")
        .in(
          "topic_id",
          topicRows.map((t) => t.id),
        )
        .eq("is_active", true)
        .order("sort_order")
    : { data: [] as { id: string; topic_id: string; name_ar: string; sort_order: number }[] };

  const subjectById = new Map(subjectRows.map((s) => [s.id, s]));
  const topicById = new Map(topicRows.map((t) => [t.id, t]));

  const lessons: AssessmentLesson[] = (lessonRows ?? [])
    .map((l) => {
      const topic = topicById.get(l.topic_id);
      const subject = topic ? subjectById.get(topic.subject_id) : undefined;
      return {
        id: l.id,
        nameAr: l.name_ar,
        topicNameAr: topic?.name_ar ?? "—",
        subjectNameAr: subject?.name_ar ?? "—",
        subjectColorHex: subject?.color_hex ?? "#7A1F3D",
        sortKey: [subject?.sort_order ?? 0, topic?.sort_order ?? 0, l.sort_order],
      };
    })
    .sort(
      (a, b) =>
        a.sortKey[0]! - b.sortKey[0]! || a.sortKey[1]! - b.sortKey[1]! || a.sortKey[2]! - b.sortKey[2]!,
    )
    .map(({ sortKey: _sortKey, ...rest }) => rest);

  const childRows = (children ?? []) as unknown as {
    id: string;
    name_ar: string;
    gender: string | null;
    student_number: string | null;
  }[];

  const { data: assessmentRows } = childRows.length
    ? await supabase
        .from("lesson_assessments")
        .select(
          "id, child_id, lesson_id, performance_level, growth_level, performance_colors, growth_colors, note_ar, assessment_evidences (id, file_path, file_type, file_name)",
        )
        .eq("classroom_id", selected)
        .limit(4000)
    : { data: [] as never[] };

  type RawRow = {
    id: string;
    child_id: string;
    lesson_id: string;
    performance_level: number;
    growth_level: number;
    performance_colors: unknown;
    growth_colors: unknown;
    note_ar: string | null;
    assessment_evidences:
      | { id: string; file_path: string; file_type: string; file_name: string | null }[]
      | null;
  };

  const raw = (assessmentRows ?? []) as unknown as RawRow[];
  const urls = await signEvidence(
    raw.flatMap((r) => (r.assessment_evidences ?? []).map((e) => e.file_path)),
  );

  const cells: AssessmentCell[] = raw.map((r) => ({
    id: r.id,
    childId: r.child_id,
    lessonId: r.lesson_id,
    performanceLevel: Math.min(3, Math.max(0, r.performance_level)) as TriangleLevel,
    growthLevel: Math.min(3, Math.max(0, r.growth_level)) as TriangleLevel,
    performanceColors: normalizeColors(r.performance_colors),
    growthColors: normalizeColors(r.growth_colors),
    note: r.note_ar,
    evidences: (r.assessment_evidences ?? []).map((e) => ({
      id: e.id,
      filePath: e.file_path,
      fileType: e.file_type as EvidenceFileKind,
      fileName: e.file_name,
      url: urls[e.file_path] ?? null,
    })),
  }));

  return {
    canEdit: true,
    classrooms: options,
    selectedClassroomId: selected,
    lessons,
    children: childRows.map((c) => ({
      id: c.id,
      nameAr: c.name_ar,
      gender: c.gender,
      studentNumber: c.student_number,
    })),
    cells,
  };
}

export type SaveAssessmentInput = {
  childId: string;
  lessonId: string;
  classroomId: string;
  performanceLevel: number;
  growthLevel: number;
  performanceColors: string[];
  growthColors: string[];
  note?: string | null;
};

/** Upserts one child × lesson evaluation cell. */
export async function saveAssessment(supabase: Db, userId: string, input: SaveAssessmentInput) {
  const { data: existing } = await supabase
    .from("lesson_assessments")
    .select("id")
    .eq("child_id", input.childId)
    .eq("lesson_id", input.lessonId)
    .maybeSingle();

  const payload = {
    performance_level: input.performanceLevel,
    growth_level: input.growthLevel,
    performance_colors: normalizeColors(input.performanceColors),
    growth_colors: normalizeColors(input.growthColors),
    note_ar: input.note?.trim() ? input.note.trim() : null,
    updated_by: userId,
  };

  if (existing?.id) {
    const { error } = await supabase.from("lesson_assessments").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { id: existing.id };
  }

  const { data, error } = await supabase
    .from("lesson_assessments")
    .insert({
      child_id: input.childId,
      lesson_id: input.lessonId,
      classroom_id: input.classroomId,
      created_by: userId,
      ...payload,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

/** Ensures a cell row exists so evidence can be attached to it. */
export async function ensureAssessment(
  supabase: Db,
  userId: string,
  input: { childId: string; lessonId: string; classroomId: string },
) {
  const { data: existing } = await supabase
    .from("lesson_assessments")
    .select("id")
    .eq("child_id", input.childId)
    .eq("lesson_id", input.lessonId)
    .maybeSingle();
  if (existing?.id) return { id: existing.id };

  const { data, error } = await supabase
    .from("lesson_assessments")
    .insert({
      child_id: input.childId,
      lesson_id: input.lessonId,
      classroom_id: input.classroomId,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function addAssessmentEvidence(
  supabase: Db,
  userId: string,
  input: {
    assessmentId: string;
    filePath: string;
    fileType: EvidenceFileKind;
    fileName?: string | null;
    fileSize?: number | null;
  },
) {
  const { error } = await supabase.from("assessment_evidences").insert({
    assessment_id: input.assessmentId,
    file_path: input.filePath,
    file_type: input.fileType,
    file_name: input.fileName ?? null,
    file_size: input.fileSize ?? null,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteAssessmentEvidence(supabase: Db, id: string) {
  const { data: row } = await supabase
    .from("assessment_evidences")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("assessment_evidences").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (row?.file_path) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(ASSESSMENT_BUCKET).remove([row.file_path]);
  }
  return { ok: true };
}
