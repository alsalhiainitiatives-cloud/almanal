/**
 * Server-only helper that fans internal notifications out to users and roles.
 *
 * Delivery goes through the `dispatch_notification` security-definer function
 * so a staff member can notify a parent (or a principal) without ever getting
 * write access to other people's notification rows.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;

export type NotifyInput = {
  userIds?: (string | null | undefined)[];
  roles?: AppRole[];
  kind: string;
  title: string;
  body?: string | null;
  applicationId?: string | null;
  link?: string | null;
  severity?: "info" | "success" | "warning" | "urgent";
};

/** Never throws: a failed notification must not roll back the business action. */
export async function notify(supabase: Db, input: NotifyInput) {
  const userIds = [...new Set((input.userIds ?? []).filter(Boolean) as string[])];
  const roles = input.roles ?? [];
  if (!userIds.length && !roles.length) return;

  const { error } = await supabase.rpc("dispatch_notification", {
    _user_ids: userIds,
    _roles: roles as Database["public"]["Enums"]["app_role"][],
    _kind: input.kind,
    _title_ar: input.title,
    _body_ar: input.body ?? undefined,
    _application_id: input.applicationId ?? undefined,
    _link: input.link ?? undefined,
    _severity: input.severity ?? "info",
  });
  if (error) console.error("notify failed", error.message);
}

export const STAFF_ROLES: AppRole[] = ["registration_officer", "principal", "supervisor", "admin"];
export const DECIDERS: AppRole[] = ["principal", "admin"];

export async function listMyNotifications(supabase: Db, userId: string, limit = 40) {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  return { rows, unread: rows.filter((row) => !row.read_at).length };
}

export async function markRead(supabase: Db, ids: string[] | null) {
  const { data, error } = await supabase.rpc("mark_notifications_read", { _ids: ids ?? [] });
  if (error) throw new Error("تعذّر تحديث حالة الإشعارات.");
  return { updated: data ?? 0 };
}