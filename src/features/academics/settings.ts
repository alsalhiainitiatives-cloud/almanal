/**
 * Academic Tracking — settings module (client-safe types + defaults).
 *
 * Two things are configurable without touching code:
 *  - the "colours of months" mapping used by the evaluation triangles
 *  - enabling/disabling the Class Chat globally, or per classroom
 */
import { MONTH_COLORS } from "./assessments";

export type MonthColor = { month: number; hex: string; label: string };

export const MONTH_NAMES_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

export const DEFAULT_MONTH_COLORS: MonthColor[] = MONTH_COLORS.map((m) => ({
  month: m.month,
  hex: m.hex,
  label: m.label,
}));

export function normalizeMonthColors(raw: unknown): MonthColor[] {
  const list = Array.isArray(raw) ? raw : [];
  return DEFAULT_MONTH_COLORS.map((fallback) => {
    const found = list.find(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && Number((item as never)["month"]) === fallback.month,
    );
    const hex = typeof found?.["hex"] === "string" ? (found["hex"] as string) : "";
    const label = typeof found?.["label"] === "string" ? (found["label"] as string) : "";
    return {
      month: fallback.month,
      hex: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : fallback.hex,
      label: label.trim() ? label.trim().slice(0, 40) : fallback.label,
    };
  });
}

export type ChatClassroomSetting = {
  id: string;
  nameAr: string;
  stageNameAr: string;
  chatEnabled: boolean;
};

export type AcademicsSettings = {
  canManage: boolean;
  monthColors: MonthColor[];
  chatEnabledGlobally: boolean;
  classrooms: ChatClassroomSetting[];
};
