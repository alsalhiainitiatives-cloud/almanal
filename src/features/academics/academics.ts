/**
 * Academic Tracking module — client-safe types and access helpers.
 *
 * Roles map onto the platform's existing RBAC:
 *  - SuperAdmin → `admin` / `supervisor` / `principal` (school administration)
 *  - Teacher    → `teacher` (own assigned classrooms only)
 *  - Parent     → `parent` (own child's classroom, read-only)
 *
 * The database enforces this through RLS; these helpers only drive the UI.
 */
import type { AppRole } from "@/features/auth/rbac";

export type AcademicRole = "super_admin" | "teacher" | "parent" | "none";

const SUPER_ADMIN_ROLES: AppRole[] = ["admin", "supervisor", "principal"];
const STAFF_VIEW_ROLES: AppRole[] = [
  "admin",
  "supervisor",
  "principal",
  "registration_officer",
  "accountant",
];

export function academicRole(roles: readonly AppRole[]): AcademicRole {
  if (roles.some((r) => SUPER_ADMIN_ROLES.includes(r))) return "super_admin";
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("parent")) return "parent";
  return "none";
}

export const ACADEMIC_ROLE_LABELS: Record<AcademicRole, string> = {
  super_admin: "مدير عام",
  teacher: "معلمة",
  parent: "ولي أمر",
  none: "بدون صلاحية",
};

/** Can open the Academic Tracking module at all. */
export function canViewAcademics(roles: readonly AppRole[]): boolean {
  return roles.some((r) => STAFF_VIEW_ROLES.includes(r) || r === "teacher" || r === "parent");
}

/** Can add / edit / delete curriculum entries (server + RLS re-check this). */
export function canEditCurriculum(roles: readonly AppRole[]): boolean {
  return roles.some((r) => STAFF_VIEW_ROLES.includes(r) || r === "teacher");
}

/** Can manage teacher assignments and module settings. */
export function canManageAcademics(roles: readonly AppRole[]): boolean {
  return roles.some((r) => SUPER_ADMIN_ROLES.includes(r));
}

export type ClassroomOption = {
  id: string;
  nameAr: string;
  colorHex: string;
  stageId: string;
  stageNameAr: string;
};

export type LessonNode = {
  id: string;
  nameAr: string;
  descriptionAr: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type TopicNode = {
  id: string;
  nameAr: string;
  sortOrder: number;
  isActive: boolean;
  lessons: LessonNode[];
};

export type SubjectNode = {
  id: string;
  classroomId: string;
  nameAr: string;
  colorHex: string;
  sortOrder: number;
  isActive: boolean;
  topics: TopicNode[];
};

export const SUBJECT_COLORS = [
  "#7A1F3D",
  "#B64A6A",
  "#C9A227",
  "#2F7D6E",
  "#3C6E9F",
  "#8A5BA6",
] as const;
