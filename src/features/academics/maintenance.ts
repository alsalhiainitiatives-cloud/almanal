/**
 * Storage & Maintenance — client-safe types for the data-retention tools.
 *
 * These tools are destructive, so they are limited to school administration
 * (SuperAdmin / Manager) both in the UI and again on the server.
 */
import type { AppRole } from "@/features/auth/rbac";

/** Only SuperAdmin (admin/supervisor) and Manager (principal) may open this section. */
const MAINTENANCE_ROLES: AppRole[] = ["admin", "supervisor", "principal"];

export function canManageStorage(roles: readonly AppRole[]): boolean {
  return roles.some((r) => MAINTENANCE_ROLES.includes(r));
}

export type RetentionWindow = "1m" | "3m" | "6m" | "term";

export const RETENTION_LABELS: Record<RetentionWindow, string> = {
  "1m": "أقدم من شهر",
  "3m": "أقدم من 3 أشهر",
  "6m": "أقدم من 6 أشهر",
  term: "أقدم من نهاية الفصل الدراسي (4 أشهر)",
};

export const RETENTION_DAYS: Record<RetentionWindow, number> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  term: 120,
};

export type ChatWipeScope = "classroom" | "stage" | "all";

export const CHAT_WIPE_LABELS: Record<ChatWipeScope, string> = {
  classroom: "فصل محدد",
  stage: "مرحلة كاملة",
  all: "جميع الفصول (تصفير نهاية العام)",
};

export const WIPE_CONFIRM_WORD = "DELETE";

export type MaintenanceBoard = {
  canManage: boolean;
  classrooms: { id: string; nameAr: string; stageId: string | null; stageNameAr: string }[];
  stages: { id: string; nameAr: string }[];
  evidenceTotal: number;
  chatMessageTotal: number;
};

export type EvidencePreview = {
  files: number;
  links: number;
  cutoff: string;
};

export type ChatWipePreview = {
  messages: number;
  attachments: number;
  scopeLabel: string;
};
