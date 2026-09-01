/**
 * Server-only service for the Academic Tracking settings module.
 *
 * Reads run for any signed-in user (the triangles and the chat both need the
 * current configuration); writes are restricted to school administration and
 * re-checked by RLS on `academics_settings` / `classrooms`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import {
  DEFAULT_MONTH_COLORS,
  normalizeMonthColors,
  type AcademicsSettings,
  type MonthColor,
} from "./settings";

type Db = SupabaseClient<Database>;

const ADMIN_ROLES: AppRole[] = ["admin", "supervisor", "principal"];

async function rolesOf(supabase: Db, userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

export async function getAcademicsSettings(supabase: Db, userId: string): Promise<AcademicsSettings> {
  const roles = await rolesOf(supabase, userId);
  const canManage = roles.some((r) => ADMIN_ROLES.includes(r));

  const [{ data: rows }, { data: classrooms }] = await Promise.all([
    supabase.from("academics_settings").select("key, value"),
    supabase
      .from("classrooms")
      .select("id, name_ar, chat_enabled, is_active, sort_order, stages (name_ar)")
      .eq("is_active", true)
      .order("sort_order")
      .limit(200),
  ]);

  const byKey = new Map((rows ?? []).map((r) => [r.key, r.value as unknown]));
  const monthColors = normalizeMonthColors(byKey.get("month_colors"));
  const chat = (byKey.get("chat") ?? {}) as Record<string, unknown>;

  return {
    canManage,
    monthColors,
    chatEnabledGlobally: chat["enabled"] !== false,
    classrooms: ((classrooms ?? []) as unknown as {
      id: string;
      name_ar: string;
      chat_enabled: boolean | null;
      stages: { name_ar: string } | null;
    }[]).map((c) => ({
      id: c.id,
      nameAr: c.name_ar,
      stageNameAr: c.stages?.name_ar ?? "—",
      chatEnabled: c.chat_enabled !== false,
    })),
  };
}

/** Month colours used by the triangles — safe fallback to the defaults. */
export async function getMonthColors(supabase: Db): Promise<MonthColor[]> {
  const { data } = await supabase
    .from("academics_settings")
    .select("value")
    .eq("key", "month_colors")
    .maybeSingle();
  return data ? normalizeMonthColors(data.value) : DEFAULT_MONTH_COLORS;
}

/** True when the chat is reachable for this classroom (global + per-class flags). */
export async function isChatEnabled(supabase: Db, classroomId: string): Promise<boolean> {
  const [{ data: setting }, { data: classroom }] = await Promise.all([
    supabase.from("academics_settings").select("value").eq("key", "chat").maybeSingle(),
    supabase.from("classrooms").select("chat_enabled").eq("id", classroomId).maybeSingle(),
  ]);
  const globalEnabled = ((setting?.value ?? {}) as Record<string, unknown>)["enabled"] !== false;
  return globalEnabled && classroom?.chat_enabled !== false;
}

async function assertAdmin(supabase: Db, userId: string) {
  const roles = await rolesOf(supabase, userId);
  if (!roles.some((r) => ADMIN_ROLES.includes(r))) {
    throw new Error("الإعدادات متاحة لإدارة المدرسة فقط.");
  }
}

export async function saveMonthColors(supabase: Db, userId: string, input: MonthColor[]) {
  await assertAdmin(supabase, userId);
  const value = normalizeMonthColors(input);
  const { error } = await supabase
    .from("academics_settings")
    .upsert({ key: "month_colors", value: value as never }, { onConflict: "key" });
  if (error) throw new Error("تعذّر حفظ ألوان الأشهر.");
  return { monthColors: value };
}

export async function setChatEnabledGlobally(supabase: Db, userId: string, enabled: boolean) {
  await assertAdmin(supabase, userId);
  const { error } = await supabase
    .from("academics_settings")
    .upsert({ key: "chat", value: { enabled } as never }, { onConflict: "key" });
  if (error) throw new Error("تعذّر تحديث حالة المحادثة.");
  return { enabled };
}

export async function setClassroomChatEnabled(
  supabase: Db,
  userId: string,
  input: { classroomId: string; enabled: boolean },
) {
  await assertAdmin(supabase, userId);
  const { error } = await supabase
    .from("classrooms")
    .update({ chat_enabled: input.enabled })
    .eq("id", input.classroomId);
  if (error) throw new Error("تعذّر تحديث محادثة هذا الفصل.");
  return { ok: true };
}
