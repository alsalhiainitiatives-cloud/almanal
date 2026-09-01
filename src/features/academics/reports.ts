/** Academic Reports — client-safe types and helpers. */
import type { MonthColor } from "./settings";
import type { EvidenceFileKind, TriangleLevel } from "./assessments";

export type ReportType = "weekly" | "monthly" | "term";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  weekly: "تقرير أسبوعي",
  monthly: "تقرير شهري",
  term: "تقرير نهاية الفصل",
};

export type ReportEvidence = {
  id: string;
  fileType: EvidenceFileKind;
  fileName: string | null;
  url: string | null;
};

export type ReportCell = {
  performanceLevel: TriangleLevel;
  growthLevel: TriangleLevel;
  performanceColors: string[];
  growthColors: string[];
  note: string | null;
  updatedAt: string | null;
  evidences: ReportEvidence[];
};

export type ReportLesson = {
  id: string;
  nameAr: string;
  cell: ReportCell | null;
};

export type ReportTopic = { id: string; nameAr: string; lessons: ReportLesson[] };

export type ReportSubject = {
  id: string;
  nameAr: string;
  colorHex: string;
  topics: ReportTopic[];
};

export type ReportSummary = {
  lessons: number;
  evaluated: number;
  mastered: number;
  practicing: number;
  started: number;
  evidences: number;
};

export type ReportChild = {
  id: string;
  nameAr: string;
  studentNumber: string | null;
};

export type ReportBoard = {
  classrooms: { id: string; nameAr: string; stageId: string | null; stageNameAr: string }[];
  selectedClassroomId: string | null;
  children: ReportChild[];
  selectedChildId: string | null;
  reportType: ReportType;
  periodLabel: string;
  monthColors: MonthColor[];
  child: ReportChild | null;
  classroomNameAr: string | null;
  stageNameAr: string | null;
  teacherNames: string[];
  subjects: ReportSubject[];
  summary: ReportSummary;
};

export function masteryLabel(level: TriangleLevel): string {
  return level === 3 ? "أتقن" : level === 2 ? "يتدرّب" : level === 1 ? "أخذ الدرس" : "لم يُقيَّم";
}
