/**
 * Server-only service for the "Academic Reports" module.
 *
 * Scope is decided by RLS + explicit checks: a teacher only reaches classrooms
 * she is assigned to, school administration reaches every classroom and child.
 * The service-role client is only used to sign evidence URLs.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { ASSESSMENT_BUCKET, normalizeColors, type EvidenceFileKind, type TriangleLevel } from "./assessments";
import type {
  ReportBoard,
  ReportCell,
  ReportSubject,
  ReportSummary,
  ReportType,
} from "./reports";
import type { MonthColor } from "./settings";
import { getMonthColors } from "./settings.server";

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

const AR_DATE = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-SA", { day: "2-digit", month: "2-digit", year: "numeric" });

function periodOf(type: ReportType): { from: string | null; label: string } {
  const now = new Date();
  if (type === "weekly") {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), label: `الأسبوع الحالي — من ${AR_DATE(from.toISOString())} إلى ${AR_DATE(now.toISOString())}` };
  }
  if (type === "monthly") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), label: `شهر ${AR_DATE(from.toISOString())} — حتى ${AR_DATE(now.toISOString())}` };
  }
  return { from: null, label: `نهاية الفصل — كل ما تم رصده حتى ${AR_DATE(now.toISOString())}` };
}

export type ReportInput = {
  classroomId?: string | null;
  childId?: string | null;
  reportType?: ReportType | null;
};

export async function getReportBoard(
  supabase: Db,
  userId: string,
  input: ReportInput,
): Promise<ReportBoard> {
  const roles = await rolesOf(supabase, userId);
  const staff = roles.some((r) => STAFF_ROLES.includes(r));
  const teacher = roles.includes("teacher");
  if (!staff && !teacher) throw new Error("التقارير متاحة للمعلمات وإدارة المدرسة فقط.");

  const reportType: ReportType = input.reportType ?? "monthly";
  const period = periodOf(reportType);
  const monthColors = await getMonthColors(supabase);

  let rows: {
    id: string;
    name_ar: string;
    stage_id: string | null;
    teacher_name: string | null;
    reports_visible_to_parents: boolean | null;
    stages: { name_ar: string } | null;
  }[] = [];

  if (staff) {
    const { data } = await supabase
      .from("classrooms")
      .select("id, name_ar, stage_id, teacher_name, reports_visible_to_parents, stages (name_ar)")
      .eq("is_active", true)
      .order("sort_order")
      .limit(200);
    rows = (data ?? []) as never;
  } else {
    const { data: links } = await supabase
      .from("teacher_classrooms")
      .select("classroom_id")
      .eq("teacher_id", userId);
    const ids = [...new Set((links ?? []).map((l) => l.classroom_id).filter(Boolean))];
    if (ids.length) {
      const { data } = await supabase
        .from("classrooms")
        .select("id, name_ar, stage_id, teacher_name, reports_visible_to_parents, stages (name_ar)")
        .in("id", ids)
        .eq("is_active", true)
        .order("sort_order")
      rows = (data ?? []) as never;
    }
  }

  const classrooms = rows.map((c) => ({
    id: c.id,
    nameAr: c.name_ar,
    stageId: c.stage_id,
    stageNameAr: c.stages?.name_ar ?? "—",
  }));

  const selectedClassroomId =
    input.classroomId && classrooms.some((c) => c.id === input.classroomId)
      ? input.classroomId
      : (classrooms[0]?.id ?? null);

  const emptySummary: ReportSummary = {
    lessons: 0,
    evaluated: 0,
    mastered: 0,
    practicing: 0,
    started: 0,
    evidences: 0,
  };

  const base: ReportBoard = {
    classrooms,
    selectedClassroomId,
    children: [],
    selectedChildId: null,
    reportType,
    periodLabel: period.label,
    monthColors,
    child: null,
    classroomNameAr: classrooms.find((c) => c.id === selectedClassroomId)?.nameAr ?? null,
    stageNameAr: classrooms.find((c) => c.id === selectedClassroomId)?.stageNameAr ?? null,
    teacherNames: [],
    subjects: [],
    summary: emptySummary,
    reportsVisibleToParents:
      rows.find((r) => r.id === selectedClassroomId)?.reports_visible_to_parents === true,
  };

  if (!selectedClassroomId) return base;

  const { data: childRows, error: childrenError } = await supabase.rpc(
    "classroom_enrolled_children",
    { _classroom_id: selectedClassroomId },
  );
  if (childrenError) throw new Error(childrenError.message);

  const children = ((childRows ?? []) as unknown as {
    id: string;
    name_ar: string;
    student_number: string | null;
  }[]).map((c) => ({
    id: c.id,
    nameAr: c.name_ar,
    studentNumber: c.student_number,
  }));

  const selectedChildId =
    input.childId && children.some((c) => c.id === input.childId)
      ? input.childId
      : (children[0]?.id ?? null);

  // Teachers of the classroom (shown on the printed header).
  const { data: links } = await supabase
    .from("teacher_classrooms")
    .select("teacher_id")
    .eq("classroom_id", selectedClassroomId);
  const teacherIds = [...new Set((links ?? []).map((l) => l.teacher_id).filter(Boolean))];
  const { data: profiles } = teacherIds.length
    ? await supabase.from("profiles").select("full_name").in("id", teacherIds)
    : { data: [] as { full_name: string }[] };
  const teacherNames = (profiles ?? []).map((p) => p.full_name).filter(Boolean);
  const fallbackTeacher = rows.find((r) => r.id === selectedClassroomId)?.teacher_name;

  const withChildren: ReportBoard = {
    ...base,
    children,
    selectedChildId,
    teacherNames: teacherNames.length ? teacherNames : fallbackTeacher ? [fallbackTeacher] : [],
    child: children.find((c) => c.id === selectedChildId) ?? null,
  };
  if (!selectedChildId) return withChildren;

  const { subjects, summary } = await buildChildReport(
    supabase,
    selectedClassroomId,
    selectedChildId,
    period.from,
  );

  return { ...withChildren, subjects, summary };
}

const EMPTY_SUMMARY: ReportSummary = {
  lessons: 0,
  evaluated: 0,
  mastered: 0,
  practicing: 0,
  started: 0,
  evidences: 0,
};

/** Builds the curriculum tree + assessed cells for one child in one classroom. */
async function buildChildReport(
  supabase: Db,
  classroomId: string,
  childId: string,
  from: string | null,
): Promise<{ subjects: ReportSubject[]; summary: ReportSummary }> {
  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("id, name_ar, color_hex, sort_order")
    .eq("classroom_id", classroomId)
    .eq("is_active", true)
    .order("sort_order");

  const subjects = subjectRows ?? [];
  const { data: topicRows } = subjects.length
    ? await supabase
        .from("topics")
        .select("id, subject_id, name_ar, sort_order")
        .in("subject_id", subjects.map((s) => s.id))
        .eq("is_active", true)
        .order("sort_order")
    : { data: [] as { id: string; subject_id: string; name_ar: string; sort_order: number }[] };

  const topics = topicRows ?? [];
  const { data: lessonRows } = topics.length
    ? await supabase
        .from("lessons")
        .select("id, topic_id, name_ar, sort_order")
        .in("topic_id", topics.map((t) => t.id))
        .eq("is_active", true)
        .order("sort_order")
    : { data: [] as { id: string; topic_id: string; name_ar: string; sort_order: number }[] };

  const lessons = lessonRows ?? [];

  let cellQuery = supabase
    .from("lesson_assessments")
    .select(
      "id, lesson_id, performance_level, growth_level, performance_colors, growth_colors, note_ar, updated_at, assessment_evidences (id, file_path, external_url, file_type, file_name)",
    )
    .eq("child_id", childId)
    .eq("classroom_id", classroomId)
    .limit(2000);
  if (from) cellQuery = cellQuery.gte("updated_at", from);

  const { data: cellRows } = await cellQuery;

  type RawCell = {
    id: string;
    lesson_id: string;
    performance_level: number;
    growth_level: number;
    performance_colors: unknown;
    growth_colors: unknown;
    note_ar: string | null;
    updated_at: string | null;
    assessment_evidences:
      | {
          id: string;
          file_path: string | null;
          external_url: string | null;
          file_type: string;
          file_name: string | null;
        }[]
      | null;
  };

  const raw = (cellRows ?? []) as unknown as RawCell[];
  const urls = await signEvidence(
    raw.flatMap((r) => (r.assessment_evidences ?? []).map((e) => e.file_path ?? "")),
  );

  const cellByLesson = new Map<string, ReportCell>();
  for (const r of raw) {
    cellByLesson.set(r.lesson_id, {
      performanceLevel: Math.min(3, Math.max(0, r.performance_level)) as TriangleLevel,
      growthLevel: Math.min(3, Math.max(0, r.growth_level)) as TriangleLevel,
      performanceColors: normalizeColors(r.performance_colors),
      growthColors: normalizeColors(r.growth_colors),
      note: r.note_ar,
      updatedAt: r.updated_at,
      evidences: (r.assessment_evidences ?? []).map((e) => ({
        id: e.id,
        fileType: e.file_type as EvidenceFileKind,
        fileName: e.file_name,
        url: urls[e.file_path] ?? null,
      })),
    });
  }

  const summary: ReportSummary = { ...EMPTY_SUMMARY };
  const tree: ReportSubject[] = subjects.map((s) => ({
    id: s.id,
    nameAr: s.name_ar,
    colorHex: s.color_hex,
    topics: topics
      .filter((t) => t.subject_id === s.id)
      .map((t) => ({
        id: t.id,
        nameAr: t.name_ar,
        lessons: lessons
          .filter((l) => l.topic_id === t.id)
          .map((l) => {
            const cell = cellByLesson.get(l.id) ?? null;
            summary.lessons += 1;
            if (cell) {
              const level = cell.performanceLevel;
              if (level > 0) summary.evaluated += 1;
              if (level === 3) summary.mastered += 1;
              if (level === 2) summary.practicing += 1;
              if (level === 1) summary.started += 1;
              summary.evidences += cell.evidences.length;
            }
            return { id: l.id, nameAr: l.name_ar, cell };
          }),
      })),
  }));

  return { subjects: tree, summary };
}

/** Teacher/staff toggle: show or hide the reports of a classroom in the parent portal. */
export async function setReportsVisibleToParents(
  supabase: Db,
  userId: string,
  input: { classroomId: string; visible: boolean },
) {
  const { data: allowed } = await supabase.rpc("can_write_classroom_curriculum", {
    _user_id: userId,
    _classroom_id: input.classroomId,
  });
  if (!allowed) throw new Error("لا تملك صلاحية تعديل إظهار تقارير هذا الفصل.");

  const { error } = await supabase
    .from("classrooms")
    .update({ reports_visible_to_parents: input.visible })
    .eq("id", input.classroomId);
  if (error) throw new Error("تعذّر تحديث إظهار التقارير لأولياء الأمور.");
  return { visible: input.visible };
}

export type ParentReportChild = {
  childId: string;
  childName: string;
  classroomId: string;
  classroomName: string | null;
  stageName: string | null;
  studentNumber: string | null;
  visible: boolean;
};

export type ParentReportBoard = {
  children: ParentReportChild[];
  selectedChildId: string | null;
  reportType: ReportType;
  periodLabel: string;
  monthColors: MonthColor[];
  teacherNames: string[];
  subjects: ReportSubject[];
  summary: ReportSummary;
};

/** Read-only report board for the parent portal (one entry per enrolled child). */
export async function getParentReportBoard(
  supabase: Db,
  userId: string,
  input: ReportInput,
): Promise<ParentReportBoard> {
  const reportType: ReportType = input.reportType ?? "monthly";
  const period = periodOf(reportType);
  const monthColors = await getMonthColors(supabase);

  const { data: kids } = await supabase
    .from("application_children")
    .select(
      "id, name_ar, classroom_id, classrooms:application_children_classroom_id_fkey (name_ar, reports_visible_to_parents, stages (name_ar)), applications!inner (parent_id, status, student_number)",
    )
    .eq("applications.parent_id", userId)
    .eq("applications.status", "approved")
    .order("name_ar")
    .limit(50);

  const children: ParentReportChild[] = ((kids ?? []) as unknown as {
    id: string;
    name_ar: string;
    classroom_id: string | null;
    classrooms:
      | { name_ar: string; reports_visible_to_parents: boolean | null; stages: { name_ar: string } | null }
      | null;
    applications: { student_number: string | null } | null;
  }[])
    .filter((k) => Boolean(k.classroom_id))
    .map((k) => ({
      childId: k.id,
      childName: k.name_ar,
      classroomId: k.classroom_id as string,
      classroomName: k.classrooms?.name_ar ?? null,
      stageName: k.classrooms?.stages?.name_ar ?? null,
      studentNumber: k.applications?.student_number ?? null,
      visible: k.classrooms?.reports_visible_to_parents === true,
    }));

  const base: ParentReportBoard = {
    children,
    selectedChildId: null,
    reportType,
    periodLabel: period.label,
    monthColors,
    teacherNames: [],
    subjects: [],
    summary: { ...EMPTY_SUMMARY },
  };

  const selected =
    children.find((c) => c.childId === input.childId) ?? children.find((c) => c.visible) ?? null;
  if (!selected || !selected.visible) return { ...base, selectedChildId: selected?.childId ?? null };

  const { data: links } = await supabase
    .from("teacher_classrooms")
    .select("teacher_id")
    .eq("classroom_id", selected.classroomId);
  const teacherIds = [...new Set((links ?? []).map((l) => l.teacher_id).filter(Boolean))];
  const { data: profiles } = teacherIds.length
    ? await supabase.from("profiles").select("full_name").in("id", teacherIds)
    : { data: [] as { full_name: string }[] };

  const { subjects, summary } = await buildChildReport(
    supabase,
    selected.classroomId,
    selected.childId,
    period.from,
  );

  return {
    ...base,
    selectedChildId: selected.childId,
    teacherNames: (profiles ?? []).map((p) => p.full_name).filter(Boolean),
    subjects,
    summary,
  };
}

