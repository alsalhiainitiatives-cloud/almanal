/**
 * Server-only service for the "Class Calendar" and "Teacher Detail" screens.
 *
 * Every read runs as the signed-in user, so row-level security decides which
 * classrooms, plans, messages and assessments are reachable.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { CalendarEvent, CalendarEventKind, ClassCalendar } from "./calendar";
import { isoOf } from "./calendar";

type Db = SupabaseClient<Database>;

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, m ?? 1, 0);
  return { start: isoOf(start), end: isoOf(end) };
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return isoOf(date);
}

/** Dates a plan item falls on inside the month, repeating weekly for monthly plans. */
function itemDates(
  planStart: string,
  planEnd: string,
  scheduledDay: number,
  monthStart: string,
  monthEnd: string,
) {
  const dates: string[] = [];
  // Align to the plan's own week start (Sunday of the plan's first week).
  const startDate = new Date(`${planStart}T00:00:00`);
  const weekStart = addDays(planStart, -startDate.getDay());
  for (let week = 0; week < 60; week += 1) {
    const date = addDays(weekStart, week * 7 + scheduledDay);
    if (date > planEnd) break;
    if (date < planStart) continue;
    if (date >= monthStart && date <= monthEnd) dates.push(date);
  }
  return dates;
}

export async function getClassCalendar(
  supabase: Db,
  input: { classroomId: string; month: string },
): Promise<ClassCalendar> {
  const { classroomId, month } = input;
  const { start, end } = monthBounds(month);
  const fromTs = `${start}T00:00:00.000Z`;
  const toTs = `${end}T23:59:59.999Z`;

  const [{ data: classroom }, { data: plans }, { data: messages }, { data: assessments }] =
    await Promise.all([
      supabase.from("classrooms").select("id, name_ar, color_hex").eq("id", classroomId).maybeSingle(),
      supabase
        .from("study_plans")
        .select("id, title_ar, plan_type, start_date, end_date, published")
        .eq("classroom_id", classroomId)
        .lte("start_date", end)
        .gte("end_date", start),
      supabase
        .from("classroom_messages")
        .select("id, created_at, body, sender_name, deleted_at")
        .eq("classroom_id", classroomId)
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: true })
        .limit(1000),
      supabase
        .from("lesson_assessments")
        .select("id, updated_at, lesson_id")
        .eq("classroom_id", classroomId)
        .gte("updated_at", fromTs)
        .lte("updated_at", toTs)
        .limit(2000),
    ]);

  const planRows = (plans ?? []) as {
    id: string;
    title_ar: string | null;
    plan_type: string;
    start_date: string;
    end_date: string;
    published: boolean;
  }[];

  const events: CalendarEvent[] = [];

  if (planRows.length) {
    const { data: items } = await supabase
      .from("study_plan_items")
      .select("id, plan_id, lesson_name_ar, subject_name_ar, color_hex, scheduled_day, scheduled_time")
      .in(
        "plan_id",
        planRows.map((p) => p.id),
      )
      .order("sort_order");

    for (const item of (items ?? []) as {
      id: string;
      plan_id: string;
      lesson_name_ar: string | null;
      subject_name_ar: string | null;
      color_hex: string;
      scheduled_day: number | null;
      scheduled_time: string | null;
    }[]) {
      const plan = planRows.find((p) => p.id === item.plan_id);
      if (!plan) continue;
      const dates = itemDates(plan.start_date, plan.end_date, item.scheduled_day ?? 0, start, end);
      for (const date of dates) {
        events.push({
          id: `${item.id}:${date}`,
          kind: "lesson",
          date,
          title: item.lesson_name_ar ?? "درس",
          subtitle:
            [item.subject_name_ar, item.scheduled_time].filter(Boolean).join(" · ") ||
            (plan.title_ar ?? null),
          colorHex: item.color_hex,
          count: null,
          published: plan.published,
          link: "/ams/academics/plans",
        });
      }
    }
  }

  const chatByDay = new Map<string, { count: number; last: string | null }>();
  for (const row of (messages ?? []) as {
    id: string;
    created_at: string;
    body: string | null;
    sender_name: string | null;
    deleted_at: string | null;
  }[]) {
    if (row.deleted_at) continue;
    const date = row.created_at.slice(0, 10);
    const entry = chatByDay.get(date) ?? { count: 0, last: null };
    entry.count += 1;
    const snippet = (row.body ?? "").trim();
    entry.last = snippet
      ? `${row.sender_name ? `${row.sender_name}: ` : ""}${snippet.slice(0, 60)}`
      : entry.last;
    chatByDay.set(date, entry);
  }
  for (const [date, entry] of chatByDay) {
    events.push({
      id: `chat:${date}`,
      kind: "chat",
      date,
      title: `${entry.count} رسالة في محادثة الفصل`,
      subtitle: entry.last,
      colorHex: null,
      count: entry.count,
      published: null,
      link: "/ams/academics/chat",
    });
  }

  const assessByDay = new Map<string, number>();
  for (const row of (assessments ?? []) as { updated_at: string }[]) {
    const date = row.updated_at.slice(0, 10);
    assessByDay.set(date, (assessByDay.get(date) ?? 0) + 1);
  }
  for (const [date, count] of assessByDay) {
    events.push({
      id: `assessment:${date}`,
      kind: "assessment",
      date,
      title: `${count} تقييم درس`,
      subtitle: "مثلث الأداء والنمو",
      colorHex: null,
      count,
      published: null,
      link: "/ams/academics/assessments",
    });
  }

  const totals = events.reduce<Record<CalendarEventKind, number>>(
    (acc, event) => {
      acc[event.kind] += event.kind === "lesson" ? 1 : (event.count ?? 1);
      return acc;
    },
    { lesson: 0, chat: 0, assessment: 0 },
  );

  events.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));

  return {
    classroomId,
    classroomName: (classroom as { name_ar?: string } | null)?.name_ar ?? null,
    month,
    events,
    totals,
  };
}

export type TeacherDetail = {
  teacher: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    lastLoginAt: string | null;
    createdAt: string | null;
  } | null;
  classrooms: Array<{
    id: string;
    nameAr: string;
    stageNameAr: string;
    colorHex: string;
    capacity: number;
    studentCount: number;
    plansCount: number;
    publishedPlansCount: number;
    messagesCount: number;
    assessmentsCount: number;
  }>;
  plans: Array<{
    id: string;
    classroomId: string;
    classroomName: string;
    titleAr: string | null;
    planType: string;
    startDate: string;
    endDate: string;
    published: boolean;
    itemsCount: number;
  }>;
  messages: Array<{
    id: string;
    classroomId: string;
    classroomName: string;
    body: string;
    createdAt: string;
  }>;
  totals: { classrooms: number; students: number; plans: number; messages: number; assessments: number };
};

/** Admin-only 360° view of one teacher: classrooms, study plans, chat activity. */
export async function getTeacherDetail(
  supabase: Db,
  actorId: string,
  teacherId: string,
): Promise<TeacherDetail> {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: actorId, _role: "admin" });
  const { data: isSupervisor } = await supabase.rpc("has_role", {
    _user_id: actorId,
    _role: "supervisor",
  });
  const { data: isPrincipal } = await supabase.rpc("has_role", {
    _user_id: actorId,
    _role: "principal",
  });
  if (!isAdmin && !isSupervisor && !isPrincipal) {
    throw new Error("غير مصرح: هذه الصفحة لمدير النظام والإدارة فقط.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: profile }, { data: links }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, last_login_at, created_at")
      .eq("id", teacherId)
      .maybeSingle(),
    supabase.from("teacher_classrooms").select("classroom_id").eq("teacher_id", teacherId),
  ]);

  const classroomIds = [
    ...new Set(((links ?? []) as { classroom_id: string }[]).map((r) => r.classroom_id)),
  ];

  const teacher = profile
    ? {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        lastLoginAt: profile.last_login_at,
        createdAt: profile.created_at,
      }
    : null;

  if (!classroomIds.length) {
    return {
      teacher,
      classrooms: [],
      plans: [],
      messages: [],
      totals: { classrooms: 0, students: 0, plans: 0, messages: 0, assessments: 0 },
    };
  }

  const [{ data: rooms }, { data: plans }, { data: messages }, { data: children }, { data: assessments }] =
    await Promise.all([
      supabase
        .from("classrooms")
        .select("id, name_ar, color_hex, capacity, stages(name_ar)")
        .in("id", classroomIds),
      supabase
        .from("study_plans")
        .select("id, classroom_id, title_ar, plan_type, start_date, end_date, published")
        .in("classroom_id", classroomIds)
        .order("start_date", { ascending: false })
        .limit(120),
      supabase
        .from("classroom_messages")
        .select("id, classroom_id, body, created_at, deleted_at")
        .in("classroom_id", classroomIds)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("application_children")
        .select("id, classroom_id, applications!inner(status, archived_at)")
        .in("classroom_id", classroomIds),
      supabase.from("lesson_assessments").select("id, classroom_id").in("classroom_id", classroomIds),
    ]);

  const roomRows = (rooms ?? []) as unknown as {
    id: string;
    name_ar: string;
    color_hex: string;
    capacity: number;
    stages: { name_ar: string } | null;
  }[];
  const nameOf = (id: string) => roomRows.find((r) => r.id === id)?.name_ar ?? "فصل";

  const ACTIVE = new Set(["approved", "submitted", "under_review", "principal_review"]);
  const studentCount = new Map<string, number>();
  for (const row of (children ?? []) as unknown as {
    classroom_id: string;
    applications: { status: string; archived_at: string | null } | null;
  }[]) {
    const app = row.applications;
    if (!app || app.archived_at || !ACTIVE.has(app.status)) continue;
    studentCount.set(row.classroom_id, (studentCount.get(row.classroom_id) ?? 0) + 1);
  }

  const planRows = (plans ?? []) as {
    id: string;
    classroom_id: string;
    title_ar: string | null;
    plan_type: string;
    start_date: string;
    end_date: string;
    published: boolean;
  }[];

  const { data: items } = planRows.length
    ? await supabase
        .from("study_plan_items")
        .select("id, plan_id")
        .in(
          "plan_id",
          planRows.map((p) => p.id),
        )
    : { data: [] as { id: string; plan_id: string }[] };

  const itemsPerPlan = new Map<string, number>();
  for (const item of (items ?? []) as { plan_id: string }[]) {
    itemsPerPlan.set(item.plan_id, (itemsPerPlan.get(item.plan_id) ?? 0) + 1);
  }

  const liveMessages = ((messages ?? []) as {
    id: string;
    classroom_id: string;
    body: string | null;
    created_at: string;
    deleted_at: string | null;
  }[]).filter((m) => !m.deleted_at);

  const assessmentRows = (assessments ?? []) as { classroom_id: string }[];

  const classrooms = roomRows.map((room) => ({
    id: room.id,
    nameAr: room.name_ar,
    stageNameAr: room.stages?.name_ar ?? "—",
    colorHex: room.color_hex,
    capacity: room.capacity,
    studentCount: studentCount.get(room.id) ?? 0,
    plansCount: planRows.filter((p) => p.classroom_id === room.id).length,
    publishedPlansCount: planRows.filter((p) => p.classroom_id === room.id && p.published).length,
    messagesCount: liveMessages.filter((m) => m.classroom_id === room.id).length,
    assessmentsCount: assessmentRows.filter((a) => a.classroom_id === room.id).length,
  }));

  return {
    teacher,
    classrooms,
    plans: planRows.map((plan) => ({
      id: plan.id,
      classroomId: plan.classroom_id,
      classroomName: nameOf(plan.classroom_id),
      titleAr: plan.title_ar,
      planType: plan.plan_type,
      startDate: plan.start_date,
      endDate: plan.end_date,
      published: plan.published,
      itemsCount: itemsPerPlan.get(plan.id) ?? 0,
    })),
    messages: liveMessages.slice(0, 40).map((m) => ({
      id: m.id,
      classroomId: m.classroom_id,
      classroomName: nameOf(m.classroom_id),
      body: (m.body ?? "").trim() || "مرفق",
      createdAt: m.created_at,
    })),
    totals: {
      classrooms: classrooms.length,
      students: classrooms.reduce((sum, c) => sum + c.studentCount, 0),
      plans: planRows.length,
      messages: liveMessages.length,
      assessments: assessmentRows.length,
    },
  };
}
