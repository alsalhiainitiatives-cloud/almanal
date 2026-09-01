/**
 * Study Plans (weekly / monthly) — client-safe types and helpers.
 *
 * A plan belongs to one classroom and holds lesson cards laid out on the
 * school week (Sunday → Thursday). Row-level security decides who reads it:
 * staff and the classroom's teachers always, parents only once published.
 */

export type PlanType = "weekly" | "monthly";

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  weekly: "خطة أسبوعية",
  monthly: "خطة شهرية",
};

/** School week — index 0 is Sunday, matching `scheduled_day`. */
export const SCHOOL_DAYS = [
  { day: 0, label: "الأحد" },
  { day: 1, label: "الاثنين" },
  { day: 2, label: "الثلاثاء" },
  { day: 3, label: "الأربعاء" },
  { day: 4, label: "الخميس" },
] as const;

export type StudyPlanItem = {
  id: string;
  lessonId: string | null;
  lessonNameAr: string;
  subjectNameAr: string | null;
  colorHex: string;
  scheduledDay: number;
  scheduledTime: string | null;
  durationMinutes: number | null;
  notes: string | null;
  sortOrder: number;
};

export type StudyPlan = {
  id: string;
  classroomId: string;
  classroomName: string | null;
  stageName: string | null;
  planType: PlanType;
  titleAr: string | null;
  notes: string | null;
  startDate: string;
  endDate: string;
  published: boolean;
  createdAt: string;
  items: StudyPlanItem[];
};

export type PlanTimeframe = "current" | "future" | "past";

export const TIMEFRAME_LABELS: Record<PlanTimeframe, string> = {
  current: "الخطة الحالية",
  future: "الخطط القادمة",
  past: "الخطط السابقة",
};

export function timeframeOf(plan: StudyPlan, today = new Date()): PlanTimeframe {
  const day = today.toISOString().slice(0, 10);
  if (plan.startDate > day) return "future";
  if (plan.endDate < day) return "past";
  return "current";
}

export function formatPlanRange(plan: StudyPlan) {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("ar-SA", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  return `${fmt(plan.startDate)} — ${fmt(plan.endDate)}`;
}

/** Default range for a new plan: upcoming Sunday for a week, or the month. */
export function defaultRange(type: PlanType, from = new Date()) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (type === "monthly") {
    const start = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(from.getFullYear(), from.getMonth() + 1, 0);
    return { startDate: iso(start), endDate: iso(end) };
  }
  const start = new Date(from);
  start.setDate(start.getDate() - ((start.getDay() + 0) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  return { startDate: iso(start), endDate: iso(end) };
}

export function planTitle(plan: StudyPlan) {
  return plan.titleAr?.trim() || `${PLAN_TYPE_LABELS[plan.planType]} — ${formatPlanRange(plan)}`;
}
