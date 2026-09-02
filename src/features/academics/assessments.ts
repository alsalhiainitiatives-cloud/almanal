/**
 * Shared, client-safe constants for the "Assessments" module.
 *
 * Each lesson evaluation carries two 3-step scales rendered as a clickable
 * triangle: performance (الأداء) and growth (النمو). Every triangle line may be
 * coloured with the month the child achieved that step.
 */
export const ASSESSMENT_BUCKET = "journey-evidence";

export type TriangleScale = "performance" | "growth";

/** 0 = not evaluated, 1 = base line, 2 = base + left line, 3 = full triangle. */
export type TriangleLevel = 0 | 1 | 2 | 3;

export const TRIANGLE_LABELS: Record<TriangleScale, Record<TriangleLevel, string>> = {
  performance: {
    0: "لم يُقيَّم",
    1: "أخذ الدرس",
    2: "يتدرّب",
    3: "أتقن",
  },
  growth: {
    0: "لم يُقيَّم",
    1: "يحتاج تذكير",
    2: "أحيانًا",
    3: "قادر دائمًا",
  },
};

export const SCALE_LABELS: Record<TriangleScale, string> = {
  performance: "الأداء",
  growth: "النمو",
};

/** Month → hex colour, exactly as required by the school's evaluation key. */
export const MONTH_COLORS = [
  { month: 1, nameAr: "يناير", label: "أزرق", hex: "#0000FF" },
  { month: 2, nameAr: "فبراير", label: "أحمر", hex: "#FF0000" },
  { month: 3, nameAr: "مارس", label: "بنفسجي", hex: "#800080" },
  { month: 4, nameAr: "أبريل", label: "أخضر", hex: "#008000" },
  { month: 5, nameAr: "مايو", label: "برتقالي", hex: "#FFA500" },
  { month: 6, nameAr: "يونيو", label: "أسود", hex: "#000000" },
  { month: 7, nameAr: "يوليو", label: "عنّابي", hex: "#800000" },
  { month: 8, nameAr: "أغسطس", label: "ذهبي", hex: "#FFD700" },
  { month: 9, nameAr: "سبتمبر", label: "أصفر", hex: "#FFFF00" },
  { month: 10, nameAr: "أكتوبر", label: "أزرق فاتح", hex: "#ADD8E6" },
  { month: 11, nameAr: "نوفمبر", label: "زهري", hex: "#FFC0CB" },
  { month: 12, nameAr: "ديسمبر", label: "بنّي", hex: "#A52A2A" },
] as const;

export const DEFAULT_LINE_COLOR = "#4B5563";

export function colorOfMonth(month: number): string {
  return MONTH_COLORS.find((m) => m.month === month)?.hex ?? DEFAULT_LINE_COLOR;
}

export function monthLabelOfColor(hex: string): string | null {
  const found = MONTH_COLORS.find((m) => m.hex.toLowerCase() === hex.toLowerCase());
  return found ? `${found.nameAr} — ${found.label}` : null;
}

export function currentMonthColor(now: Date = new Date()): string {
  return colorOfMonth(now.getMonth() + 1);
}

/** Normalizes a stored colour array into exactly three entries. */
export function normalizeColors(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  return [0, 1, 2].map((i) => {
    const value = list[i];
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_LINE_COLOR;
  });
}

/** Uploaded evidence kinds (an evidence may also be an external "link"). */
export type UploadedEvidenceKind = "image" | "video" | "pdf";
export type EvidenceFileKind = UploadedEvidenceKind | "link";

export const ASSESSMENT_EVIDENCE_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,application/pdf";

export const ASSESSMENT_EVIDENCE_LIMITS_MB: Record<UploadedEvidenceKind, number> = {
  image: 5,
  video: 25,
  pdf: 10,
};

export const EVIDENCE_KIND_LABELS_AR: Record<EvidenceFileKind, string> = {
  image: "صورة",
  video: "فيديو",
  pdf: "ملف PDF",
  link: "رابط خارجي",
};

export function assessmentEvidenceKind(file: {
  type: string;
  name: string;
}): UploadedEvidenceKind | null {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "pdf";
  if (/\.(jpe?g|png|webp)$/i.test(file.name)) return "image";
  if (/\.(mp4|mov|m4v)$/i.test(file.name)) return "video";
  if (/\.pdf$/i.test(file.name)) return "pdf";
  return null;
}

/** Guesses the evidence kind of a pasted URL so the viewer picks the right player. */
export function evidenceKindOfUrl(url: string): EvidenceFileKind {
  const clean = url.split("?")[0]?.toLowerCase() ?? "";
  if (/\.(jpe?g|png|webp|gif|avif)$/.test(clean)) return "image";
  if (/\.(mp4|webm|mov|m4v)$/.test(clean)) return "video";
  if (/\.pdf$/.test(clean)) return "pdf";
  return "link";
}

export type AssessmentEvidence = {
  id: string;
  filePath: string | null;
  externalUrl: string | null;
  fileType: EvidenceFileKind;
  fileName: string | null;
  url: string | null;
};


export type AssessmentCell = {
  id: string;
  childId: string;
  lessonId: string;
  performanceLevel: TriangleLevel;
  growthLevel: TriangleLevel;
  performanceColors: string[];
  growthColors: string[];
  note: string | null;
  evidences: AssessmentEvidence[];
};

export type AssessmentLesson = {
  id: string;
  nameAr: string;
  topicNameAr: string;
  subjectNameAr: string;
  subjectColorHex: string;
};

export type AssessmentChild = {
  id: string;
  nameAr: string;
  gender: string | null;
  studentNumber: string | null;
};

export type AssessmentBoard = {
  canEdit: boolean;
  classrooms: { id: string; nameAr: string; stageNameAr: string }[];
  selectedClassroomId: string | null;
  lessons: AssessmentLesson[];
  children: AssessmentChild[];
  cells: AssessmentCell[];
};
