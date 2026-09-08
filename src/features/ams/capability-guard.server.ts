/**
 * Shared server-side capability guard.
 *
 * Legacy role capabilities (`roles.ts`) are only the *baseline*. Since the
 * dynamic RBAC matrix lets an admin grant any permission to any role (e.g. a
 * teacher granted `students.view`), the guard must also accept the caller when
 * they hold any granular permission mapped to the requested capability.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { can, type Capability } from "./roles";

type Db = SupabaseClient<Database>;

/** Granular permission codes that satisfy each legacy capability (any-of). */
export const CAPABILITY_PERMISSIONS: Record<Capability, string[]> = {
  view: [
    "applications.view",
    "students.view",
    "attendance.view",
    "guardians.link",
    "reports.view",
    "invoices.view",
  ],
  review: ["applications.review", "applications.approve"],
  documents: ["applications.review", "documents.view", "documents.manage"],
  assign: ["classrooms.assign", "enrollment.manage", "students.edit"],
  recommend: ["applications.review", "applications.approve"],
  decide: ["applications.approve"],
  seats: [
    "classrooms.assign",
    "enrollment.manage",
    "students.create",
    "students.edit",
    "students.import",
    "guardians.link",
    "guardians.invite",
    "attendance.record",
    "students.withdraw",
  ],
  waitlist: ["enrollment.manage", "applications.review"],
  qurra: ["applications.review", "enrollment.manage"],
  notes: ["applications.view", "applications.review"],
  confidential: ["applications.approve", "audit.view"],
  payments: ["payments.manage", "invoices.view"],
  reports: ["reports.view", "reports.financial", "academic_reports.view", "students.export"],
  archive: ["settings.manage", "students.delete", "students.withdraw_confirm"],
};

export async function rolesOfUser(supabase: Db, userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

/** Effective permission codes of the signed-in caller (roles + overrides). */
export async function effectivePermissions(supabase: Db): Promise<string[]> {
  const { data } = await supabase.rpc("my_permissions");
  return ((data ?? []) as { permission_key: string }[]).map((row) => row.permission_key);
}

/**
 * Throws when the caller has neither the legacy role capability nor any
 * granular permission mapped to it. Returns the caller's roles on success.
 */
export async function ensureCapability(
  supabase: Db,
  userId: string,
  capability: Capability,
  message: string,
): Promise<AppRole[]> {
  const roles = await rolesOfUser(supabase, userId);
  if (can(roles, capability)) return roles;

  const codes = CAPABILITY_PERMISSIONS[capability] ?? [];
  if (codes.length > 0) {
    const held = new Set(await effectivePermissions(supabase));
    if (codes.some((code) => held.has(code))) return roles;
  }

  throw new Error(message);
}
