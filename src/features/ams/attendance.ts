/** Client-safe attendance vocabulary and helpers. */

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "غياب بعذر",
};

export const ATTENDANCE_STYLES: Record<AttendanceStatus, string> = {
  present: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  absent: "border-destructive/40 bg-destructive/10 text-destructive",
  late: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  excused: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as string[]).includes(value);
}

export function attendanceRate(counts: Record<AttendanceStatus, number>) {
  const total = ATTENDANCE_STATUSES.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  if (!total) return null;
  return Math.round((((counts.present ?? 0) + (counts.late ?? 0)) / total) * 100);
}
