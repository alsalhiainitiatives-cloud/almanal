/**
 * Class Calendar — client-safe types and date helpers.
 *
 * One month grid merging three sources for a classroom: study-plan lessons,
 * class-chat activity and lesson assessments (evaluations).
 */

export type CalendarEventKind = "lesson" | "chat" | "assessment" | "attendance";

export const EVENT_KIND_LABELS: Record<CalendarEventKind, string> = {
  lesson: "درس من الخطة",
  chat: "محادثة الفصل",
  assessment: "تقييمات",
  attendance: "الحضور والغياب",
};

export const EVENT_KIND_STYLES: Record<CalendarEventKind, string> = {
  lesson: "border-primary/40 bg-primary/10 text-primary",
  chat: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  assessment: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  attendance: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  /** ISO date (YYYY-MM-DD) in the school calendar. */
  date: string;
  title: string;
  subtitle: string | null;
  colorHex: string | null;
  count: number | null;
  published: boolean | null;
  link: string | null;
};

export type ClassCalendar = {
  classroomId: string;
  classroomName: string | null;
  month: string;
  events: CalendarEvent[];
  totals: Record<CalendarEventKind, number>;
};

export function isoOf(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthKey(date = new Date()) {
  return isoOf(date).slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1 + delta, 1);
  return monthKey(date);
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("ar-SA", {
    month: "long",
    year: "numeric",
  });
}

/** Weekday headers, Sunday-first to match the Saudi school week. */
export const WEEKDAY_LABELS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** Builds a 7-column grid of ISO dates (null = padding cell) for one month. */
export function buildMonthGrid(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, (m ?? 1) - 1, 1);
  const daysInMonth = new Date(y, (m ?? 1), 0).getDate();
  const lead = first.getDay(); // 0 = Sunday
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(isoOf(new Date(y, (m ?? 1) - 1, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function groupByDate(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    map.set(event.date, [...(map.get(event.date) ?? []), event]);
  }
  return map;
}
