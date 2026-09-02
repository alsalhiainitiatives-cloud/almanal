/**
 * Server-only "student profile" service for Student Affairs.
 *
 * Aggregates everything staff needs on one child page: academic placement,
 * attendance history, curriculum assessments and the media attached to them.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { buildChildReport } from "@/features/academics/reports.server";
import type { ReportSubject, ReportSummary } from "@/features/academics/reports";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "./attendance";
import { ensureCapability } from "./capability-guard.server";

type Db = SupabaseClient<Database>;

export type StudentProfileMedia = {
  id: string;
  url: string;
  kind: "image" | "video" | "pdf" | "link" | "file";
  name: string | null;
  context: string;
};

export type StudentProfileData = {
  childId: string;
  classroomId: string | null;
  classroomName: string | null;
  stageName: string | null;
  teacherNames: string[];
  month: string;
  attendance: {
    counts: Record<AttendanceStatus, number>;
    records: { attendance_date: string; status: AttendanceStatus; note: string | null }[];
    yearCounts: Record<AttendanceStatus, number>;
  };
  subjects: ReportSubject[];
  summary: ReportSummary;
  media: StudentProfileMedia[];
};

const emptyCounts = () =>
  ATTENDANCE_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<AttendanceStatus, number>,
  );

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, 1));
  const end = new Date(Date.UTC(y ?? 2026, m ?? 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function guard(supabase: Db, userId: string) {
  const roles = await ensureCapability(
    supabase,
    userId,
    "view",
    "ليس لديك صلاحية الوصول إلى سجل الطالب.",
  ).catch((error: Error) => {
    throw error;
  });
  return roles;
}

export async function getStudentProfile(
  supabase: Db,
  userId: string,
  input: { childId: string; month: string },
): Promise<StudentProfileData> {
  await guard(supabase, userId);

  const { data: child, error } = await supabase
    .from("application_children")
    .select("id, classroom_id, stage_id")
    .eq("id", input.childId)
    .maybeSingle();
  if (error || !child) throw new Error("لم يتم العثور على الطالب.");

  const { start, end } = monthBounds(input.month);
  const yearStart = `${input.month.slice(0, 4)}-01-01`;
  const yearEnd = `${input.month.slice(0, 4)}-12-31`;

  const [{ data: monthRows }, { data: yearRows }, classroom, stage] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("attendance_date, status, note")
      .eq("child_id", input.childId)
      .gte("attendance_date", start)
      .lte("attendance_date", end)
      .order("attendance_date"),
    supabase
      .from("attendance_records")
      .select("status")
      .eq("child_id", input.childId)
      .gte("attendance_date", yearStart)
      .lte("attendance_date", yearEnd)
      .limit(5000),
    child.classroom_id
      ? supabase.from("classrooms").select("id, name_ar, teacher_name").eq("id", child.classroom_id).maybeSingle()
      : Promise.resolve({ data: null }),
    child.stage_id
      ? supabase.from("stages").select("name_ar").eq("id", child.stage_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const counts = emptyCounts();
  for (const row of monthRows ?? []) {
    const status = row.status as AttendanceStatus;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  const yearCounts = emptyCounts();
  for (const row of yearRows ?? []) {
    const status = row.status as AttendanceStatus;
    yearCounts[status] = (yearCounts[status] ?? 0) + 1;
  }

  let teacherNames: string[] = [];
  if (child.classroom_id) {
    const { data: links } = await supabase
      .from("teacher_classrooms")
      .select("teacher_id")
      .eq("classroom_id", child.classroom_id);
    const ids = [...new Set((links ?? []).map((l) => l.teacher_id).filter(Boolean))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("profiles").select("full_name").in("id", ids);
      teacherNames = (profiles ?? []).map((p) => p.full_name).filter(Boolean);
    }
  }
  const fallbackTeacher = (classroom.data as { teacher_name?: string | null } | null)?.teacher_name;
  if (!teacherNames.length && fallbackTeacher) teacherNames = [fallbackTeacher];

  const report = child.classroom_id
    ? await buildChildReport(supabase, child.classroom_id, input.childId, null)
    : {
        subjects: [] as ReportSubject[],
        summary: {
          lessons: 0,
          evaluated: 0,
          mastered: 0,
          practicing: 0,
          started: 0,
          evidences: 0,
        } as ReportSummary,
      };

  const media: StudentProfileMedia[] = [];
  for (const subject of report.subjects) {
    for (const topic of subject.topics) {
      for (const lesson of topic.lessons) {
        for (const evidence of lesson.cell?.evidences ?? []) {
          if (!evidence.url) continue;
          media.push({
            id: evidence.id,
            url: evidence.url,
            kind: evidence.fileType === "image" ? "image" : evidence.fileType === "video" ? "video" : evidence.fileType === "pdf" ? "pdf" : evidence.fileType === "link" ? "link" : "file",
            name: evidence.fileName,
            context: `${subject.nameAr} · ${lesson.nameAr}`,
          });
        }
      }
    }
  }

  return {
    childId: input.childId,
    classroomId: child.classroom_id,
    classroomName: (classroom.data as { name_ar?: string } | null)?.name_ar ?? null,
    stageName: (stage.data as { name_ar?: string } | null)?.name_ar ?? null,
    teacherNames,
    month: input.month,
    attendance: {
      counts,
      yearCounts,
      records: (monthRows ?? []) as StudentProfileData["attendance"]["records"],
    },
    subjects: report.subjects,
    summary: report.summary,
    media,
  };
}
