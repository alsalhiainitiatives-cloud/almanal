/** Client-side helpers for the admissions queue (presentation only). */
import type { QueueRow } from "./types";

export type ViewMode = "table" | "cards";
export type SortKey = "recent" | "oldest" | "priority" | "sla" | "completion" | "name";

export const SORT_LABELS: Record<SortKey, string> = {
  recent: "الأحدث تقديمًا",
  oldest: "الأقدم تقديمًا",
  priority: "الأولوية",
  sla: "الأطول انتظارًا",
  completion: "الأقل اكتمالًا",
  name: "اسم ولي الأمر",
};

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };

export function submittedAt(row: QueueRow) {
  return new Date(row.submitted_at ?? row.created_at ?? Date.now()).getTime();
}

/** Whole days since the application entered the queue. */
export function ageInDays(row: QueueRow) {
  return Math.max(0, Math.floor((Date.now() - submittedAt(row)) / 864e5));
}

export function slaTone(row: QueueRow): "green" | "yellow" | "red" {
  if (["approved", "rejected"].includes(row.status)) return "green";
  const days = ageInDays(row);
  if (days >= 5) return "red";
  if (days >= 3) return "yellow";
  return "green";
}

export function docsPercent(row: QueueRow) {
  if (!row.documentsTotal) return 0;
  return Math.round((row.documentsApproved / row.documentsTotal) * 100);
}

export function studentNames(row: QueueRow) {
  return row.children.map((child) => child.name_ar).filter(Boolean);
}

export function initialsOf(name: string) {
  const parts = String(name ?? "").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("") || "؟";
}

export function sortRows(rows: QueueRow[], sort: SortKey) {
  const list = [...rows];
  list.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return submittedAt(a) - submittedAt(b);
      case "priority":
        return (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0);
      case "sla":
        return ageInDays(b) - ageInDays(a);
      case "completion":
        return docsPercent(a) - docsPercent(b);
      case "name":
        return String(a.parentName).localeCompare(String(b.parentName), "ar");
      default:
        return submittedAt(b) - submittedAt(a);
    }
  });
  return list.sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

export function matchesTerm(row: QueueRow, needle: string) {
  if (!needle) return true;
  const haystack = [
    row.application_number,
    row.tracking_number,
    row.student_number,
    row.parentName,
    row.parentPhone,
    row.parentEmail,
    row.parent_national_id,
    ...row.children.flatMap((child) => [child.name_ar, child.national_id]),
  ];
  return haystack.filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
}

/** Simple CSV export of the current result set. */
export function toCsv(rows: QueueRow[]) {
  const header = [
    "رقم الطلب",
    "ولي الأمر",
    "الجوال",
    "الطلاب",
    "الحالة",
    "الأولوية",
    "المستندات",
    "المقعد",
    "السداد",
    "المسؤول",
    "أيام الانتظار",
  ];
  const body = rows.map((row) => [
    row.application_number ?? "",
    row.parentName ?? "",
    row.parentPhone ?? "",
    studentNames(row).join(" | "),
    row.status,
    row.priority,
    `${row.documentsApproved}/${row.documentsTotal}`,
    row.seat_status,
    row.payment_status,
    row.officerName ?? "",
    String(ageInDays(row)),
  ]);
  return [header, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}