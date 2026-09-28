/**
 * Server-only data layer for custom (admin-defined) roles.
 *
 * Custom roles let an administrator introduce a new role — e.g. "وكيلة المدرسة" —
 * and grant it any subset of the existing permission catalog, without new code.
 * All writes go through SECURITY DEFINER functions that re-check the admin role
 * in the database, so no service-role key is used at runtime.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { getRequestMeta, recordAudit } from "./auth.server";

type Db = SupabaseClient<Database>;

export type CustomRole = {
  id: string;
  slug: string;
  nameAr: string;
  descriptionAr: string;
  color: string;
  isActive: boolean;
  permissionKeys: string[];
};

export type CustomRoleMatrix = {
  roles: CustomRole[];
  assignments: Array<{ userId: string; customRoleId: string }>;
};

export async function listCustomRoleMatrix(supabase: Db): Promise<CustomRoleMatrix> {
  const client = supabase as any;
  const [{ data: roles }, { data: rolePermissions }, { data: assignments }] = await Promise.all([
    client
      .from("custom_roles")
      .select("id, slug, name_ar, description_ar, color, is_active, created_at")
      .order("created_at", { ascending: true }),
    client.from("custom_role_permissions").select("custom_role_id, permission_key"),
    client.from("user_custom_roles").select("user_id, custom_role_id"),
  ]);

  const permissionsByRole = new Map<string, string[]>();
  for (const row of (rolePermissions ?? []) as Array<{
    custom_role_id: string;
    permission_key: string;
  }>) {
    const list = permissionsByRole.get(row.custom_role_id) ?? [];
    list.push(row.permission_key);
    permissionsByRole.set(row.custom_role_id, list);
  }

  return {
    roles: ((roles ?? []) as Array<Record<string, any>>).map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      nameAr: row.name_ar as string,
      descriptionAr: (row.description_ar as string) ?? "",
      color: (row.color as string) ?? "bg-lavender/70 text-foreground",
      isActive: Boolean(row.is_active),
      permissionKeys: permissionsByRole.get(row.id as string) ?? [],
    })),
    assignments: ((assignments ?? []) as Array<{ user_id: string; custom_role_id: string }>).map(
      (row) => ({ userId: row.user_id, customRoleId: row.custom_role_id }),
    ),
  };
}

/** Latin slug derived from the Arabic name; falls back to a random suffix. */
function toSlug(nameAr: string) {
  const base = nameAr
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base ? `role-${base}`.slice(0, 60) : "";
}

export async function upsertCustomRole(
  supabase: Db,
  actorId: string,
  input: {
    id?: string | null;
    nameAr: string;
    descriptionAr: string;
    color: string;
    isActive: boolean;
  },
) {
  const { data, error } = await (supabase as any).rpc("admin_upsert_custom_role", {
    _id: input.id ?? null,
    _slug: input.id ? null : toSlug(input.nameAr),
    _name_ar: input.nameAr,
    _description_ar: input.descriptionAr,
    _color: input.color,
    _is_active: input.isActive,
  });
  if (error) throw new Error("تعذّر حفظ الدور المخصص.");

  await recordAudit({
    userId: actorId,
    action: input.id ? "custom_roles.update" : "custom_roles.create",
    entity: "custom_roles",
    entityId: (data as string) ?? null,
    metadata: { nameAr: input.nameAr, isActive: input.isActive },
    meta: getRequestMeta(),
  });
  return { ok: true as const, id: data as string };
}

export async function deleteCustomRole(supabase: Db, actorId: string, id: string) {
  const { error } = await (supabase as any).rpc("admin_delete_custom_role", { _id: id });
  if (error) throw new Error("تعذّر حذف الدور المخصص.");

  await recordAudit({
    userId: actorId,
    action: "custom_roles.delete",
    entity: "custom_roles",
    entityId: id,
    meta: getRequestMeta(),
  });
  return { ok: true as const };
}

export async function setCustomRolePermissions(
  supabase: Db,
  actorId: string,
  customRoleId: string,
  permissionKeys: string[],
) {
  const { data, error } = await (supabase as any).rpc("admin_set_custom_role_permissions", {
    _custom_role_id: customRoleId,
    _permission_keys: permissionKeys,
  });
  if (error) throw new Error("تعذّر تحديث صلاحيات الدور المخصص.");

  await recordAudit({
    userId: actorId,
    action: "custom_roles.permissions",
    entity: "custom_role_permissions",
    entityId: customRoleId,
    metadata: { count: permissionKeys.length },
    meta: getRequestMeta(),
  });
  return { ok: true as const, affected: Number(data ?? 0) };
}

export async function setUserCustomRoles(
  supabase: Db,
  actorId: string,
  userId: string,
  customRoleIds: string[],
) {
  const { error } = await (supabase as any).rpc("admin_set_user_custom_roles", {
    _user_id: userId,
    _custom_role_ids: customRoleIds,
  });
  if (error) throw new Error("تعذّر تحديث الأدوار المخصصة للمستخدم.");

  await recordAudit({
    userId: actorId,
    action: "custom_roles.assign",
    entity: "user_custom_roles",
    entityId: userId,
    metadata: { customRoleIds },
    meta: getRequestMeta(),
  });
  return { ok: true as const };
}
