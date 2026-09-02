/**
 * Server-only attendance service.
 *
 * Runs as the signed-in user, so RLS decides who may read or record: school
 * staff and the classroom teacher can write, the guardian can read.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "./attendance";

type Db = SupabaseClient<Database>;

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  const end = new Date(Date.UTC(y, m ?? 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

const emptyCounts = () =>
  ATTENDANCE_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<AttendanceStatus, number>,
  );

/** Classrooms the signed-in user may record attendance for. */
export async function listAttendanceClassrooms(supabase: Db) {
  const { data, error } = await supabase
    .from("classrooms")
    .select("id, name_ar, stage_id, stages ( name_ar )")
    .order("sort_order");
  if (error) throw new Error("تعذّر تحميل الفصول.");
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name_ar,
    stageId: c.stage_id,
    stageName: (c.stages as unknown as { name_ar: string } | null)?.name_ar ?? null,
  }));
}

export async function getAttendanceBoard(
  supabase: Db,
  input: { classroomId: string; date: string; month: string },
) {
  const { start, end } = monthBounds(input.month);

  const [{ data: roster, error: rosterError }, { data: today }, { data: monthRows }] =
    await Promise.all([
      supabase.rpc("classroom_enrolled_children", { _classroom_id: input.classroomId }),
      supabase
        .from("attendance_records")
        .select("id, child_id, status, note")
        .eq("classroom_id", input.classroomId)
        .eq("attendance_date", input.date),
      supabase
        .from("attendance_records")
        .select("child_id, status, attendance_date")
        .eq("classroom_id", input.classroomId)
        .gte("attendance_date", start)
        .lte("attendance_date", end)
        .limit(5000),
    ]);
  if (rosterError) throw new Error("تعذّر تحميل قائمة الطلاب.");

  const todayByChild = new Map((today ?? []).map((r) => [r.child_id, r]));
  const counts = new Map<string, Record<AttendanceStatus, number>>();
  const perDay = new Map<string, Record<AttendanceStatus, number>>();
  for (const row of monthRows ?? []) {
    const status = row.status as AttendanceStatus;
    const child = counts.get(row.child_id) ?? emptyCounts();
    child[status] = (child[status] ?? 0) + 1;
    counts.set(row.child_id, child);
    const day = perDay.get(row.attendance_date) ?? emptyCounts();
    day[status] = (day[status] ?? 0) + 1;
    perDay.set(row.attendance_date, day);
  }

  const students = (
    (roster ?? []) as { id: string; name_ar: string; gender: string | null; student_number: string | null }[]
  ).map((child) => ({
    childId: child.id,
    name: child.name_ar,
    gender: child.gender,
    academicNumber: child.student_number,
    status: (todayByChild.get(child.id)?.status ?? null) as AttendanceStatus | null,
    note: todayByChild.get(child.id)?.note ?? null,
    monthCounts: counts.get(child.id) ?? emptyCounts(),
  }));

  return {
    classroomId: input.classroomId,
    date: input.date,
    month: input.month,
    students,
    days: [...perDay.entries()].map(([date, c]) => ({ date, counts: c })).sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
}

export async function saveAttendance(
  supabase: Db,
  userId: string,
  input: {
    classroomId: string;
    date: string;
    entries: { childId: string; status: AttendanceStatus | null; note?: string | null }[];
  },
) {
  const clears = input.entries.filter((e) => !e.status).map((e) => e.childId);
  const upserts = input.entries.filter((e) => e.status);

  if (clears.length) {
    const { error } = await supabase
      .from("attendance_records")
      .delete()
      .eq("attendance_date", input.date)
      .in("child_id", clears);
    if (error) throw new Error("تعذّر حذف تسجيل الحضور.");
  }

  if (upserts.length) {
    const { error } = await supabase.from("attendance_records").upsert(
      upserts.map((e) => ({
        child_id: e.childId,
        classroom_id: input.classroomId,
        attendance_date: input.date,
        status: e.status as AttendanceStatus,
        note: e.note?.trim() || null,
        recorded_by: userId,
      })),
      { onConflict: "child_id,attendance_date" },
    );
    if (error) throw new Error("تعذّر حفظ الحضور. تأكد من صلاحيتك على هذا الفصل.");
  }

  return { ok: true as const, saved: upserts.length, cleared: clears.length };
}

/** Guardian view: monthly attendance of one child. */
export async function getChildAttendance(
  supabase: Db,
  input: { childId: string; month: string },
) {
  const { start, end } = monthBounds(input.month);
  const { data, error } = await supabase
    .from("attendance_records")
    .select("attendance_date, status, note")
    .eq("child_id", input.childId)
    .gte("attendance_date", start)
    .lte("attendance_date", end)
    .order("attendance_date");
  if (error) throw new Error("تعذّر تحميل سجل الحضور.");

  const counts = emptyCounts();
  for (const row of data ?? []) {
    const status = row.status as AttendanceStatus;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return { month: input.month, records: data ?? [], counts };
}
