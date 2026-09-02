/**
 * Server-only auth/RBAC service layer. Called exclusively from
 * `auth.functions.ts` and `admin.functions.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { AppRole } from "./rbac";
import type { ProfileInput, SignInInput } from "./schemas";
import {
  getRequestMeta,
  isRateLimited,
  recordAudit,
  recordLoginAttempt,
  registerSessionRecord,
  resolveEmail,
  serverAuthClient,
} from "./auth.server";

type Db = SupabaseClient<Database>;

export type SecurityContext = {
  profile: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    preferredLanguage: string;
    lastLoginAt: string | null;
  } | null;
  roles: AppRole[];
  permissions: string[];
  sessions: Array<{
    id: string;
    device: string | null;
    browser: string | null;
    ipAddress: string | null;
    lastSeenAt: string;
    rememberMe: boolean;
  }>;
};

export type SignInResult =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; message: string };

export async function performSignIn(data: SignInInput): Promise<SignInResult> {
  const meta = getRequestMeta();
  const identifier = data.identifier.trim().toLowerCase();

  if (await isRateLimited(identifier, meta.ip)) {
    await recordAudit({
      action: "auth.login.blocked",
      success: false,
      metadata: { identifier },
      meta,
    });
    return {
      ok: false,
      message: "تم تجاوز عدد المحاولات المسموح. يرجى المحاولة بعد 15 دقيقة.",
    };
  }

  const email = await resolveEmail(identifier);
  if (!email) {
    await recordLoginAttempt({ identifier, success: false, meta });
    return { ok: false, message: "بيانات الدخول غير صحيحة." };
  }

  const auth = serverAuthClient();
  const { data: result, error } = await auth.auth.signInWithPassword({
    email,
    password: data.password,
  });

  if (error || !result.session || !result.user) {
    await recordLoginAttempt({ identifier, success: false, meta });
    await recordAudit({
      action: "auth.login",
      actorEmail: email,
      success: false,
      metadata: { reason: error?.message ?? "invalid_credentials" },
      meta,
    });
    return { ok: false, message: "بيانات الدخول غير صحيحة." };
  }

  await recordLoginAttempt({ identifier, success: true, meta });
  await registerSessionRecord({
    userId: result.user.id,
    rememberMe: Boolean(data.rememberMe),
    meta,
  });
  await recordAudit({
    userId: result.user.id,
    actorEmail: email,
    action: "auth.login",
    success: true,
    metadata: { rememberMe: Boolean(data.rememberMe) },
    meta,
  });

  return {
    ok: true as const,
    accessToken: result.session.access_token,
    refreshToken: result.session.refresh_token,
  };
}

export async function buildSecurityContext(supabase: Db, userId: string): Promise<SecurityContext> {
  const [{ data: profile }, { data: roleRows }, { data: sessionRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, preferred_language, last_login_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("user_sessions")
      .select("id, device, browser, ip_address, last_seen_at, remember_me")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false })
      .limit(10),
  ]);

  const roles = (roleRows ?? []).map((r) => r.role as AppRole);

  let permissions: string[] = [];
  if (roles.length) {
    const { data: permRows } = await supabase
      .from("role_permissions")
      .select("permission_key")
      .in("role", roles);
    permissions = [...new Set((permRows ?? []).map((p) => p.permission_key))];
  }

  // Per-user overrides win over the role defaults.
  const { data: overrideRows } = await (supabase as any)
    .from("user_permissions")
    .select("permission_key, granted")
    .eq("user_id", userId);
  for (const row of (overrideRows ?? []) as Array<{ permission_key: string; granted: boolean }>) {
    if (row.granted) {
      if (!permissions.includes(row.permission_key)) permissions.push(row.permission_key);
    } else {
      permissions = permissions.filter((key) => key !== row.permission_key);
    }
  }

  return {
    profile: profile
      ? {
          id: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          avatarUrl: profile.avatar_url,
          preferredLanguage: profile.preferred_language,
          lastLoginAt: profile.last_login_at,
        }
      : null,
    roles,
    permissions,
    sessions: (sessionRows ?? []).map((s) => ({
      id: s.id,
      device: s.device,
      browser: s.browser,
      ipAddress: s.ip_address,
      lastSeenAt: s.last_seen_at,
      rememberMe: s.remember_me,
    })),
  };
}

export async function saveProfile(supabase: Db, userId: string, data: ProfileInput) {
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName,
      phone: data.phone || null,
      preferred_language: data.preferredLanguage,
      avatar_url: data.avatarUrl || null,
    })
    .eq("id", userId);

  if (error) throw new Error("تعذّر حفظ البيانات، يرجى المحاولة لاحقًا.");

  await recordAudit({
    userId,
    action: "profile.update",
    entity: "profiles",
    entityId: userId,
    meta: getRequestMeta(),
  });
  return { ok: true as const };
}

export async function revokeOtherSessionRecords(supabase: Db, userId: string) {
  const meta = getRequestMeta();

  // SECURITY DEFINER function scoped to auth.uid() — no service-role key needed.
  await (supabase as any).rpc("revoke_my_other_sessions", {
    _user_agent: meta.userAgent,
    _ip: meta.ip,
  });

  await recordAudit({ userId, action: "auth.sessions.revoke_others", meta });
  return { ok: true as const };
}

export async function writeSecurityEvent(userId: string, action: string) {
  await recordAudit({ userId, action, meta: getRequestMeta() });
  return { ok: true as const };
}

/** Admin-only: users with their roles. Requires the caller to be an admin. */
export async function assertAdmin(supabase: Db, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("غير مصرح: هذه العملية لمدير النظام فقط.");
}

export async function listUsersWithRoles(supabase: Db) {
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, last_login_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  return (profiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    phone: p.phone,
    lastLoginAt: p.last_login_at,
    createdAt: p.created_at,
    roles: (roles ?? [])
      .filter((r) => r.user_id === p.id)
      .map((r) => r.role as AppRole),
  }));
}

export async function replaceUserRoles(
  supabase: Db,
  actorId: string,
  userId: string,
  roles: AppRole[],
) {
  const meta = getRequestMeta();

  // Handled by a SECURITY DEFINER function that re-checks the admin role in the
  // database, so no service-role key is needed at runtime.
  const { error } = await (supabase as any).rpc("admin_set_user_roles", {
    _user_id: userId,
    _roles: roles,
  });
  if (error) throw new Error("تعذّر تحديث الأدوار.");

  await recordAudit({
    userId: actorId,
    action: "roles.assign",
    entity: "user_roles",
    entityId: userId,
    metadata: { roles },
    meta,
  });
  return { ok: true as const };
}

export async function listAuditEntries(supabase: Db, limit: number) {
  const { data } = await supabase
    .from("audit_logs")
    .select("id, user_id, actor_email, action, entity, entity_id, ip_address, browser, device, success, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listRolePermissionMatrix(supabase: Db) {
  const [{ data: permissions }, { data: rolePermissions }] = await Promise.all([
    (supabase as any)
      .from("permissions")
      .select("key, description_ar, category, module_name, sub_module_name, action, sort_order")
      .order("module_name")
      .order("sub_module_name")
      .order("sort_order"),
    supabase.from("role_permissions").select("role, permission_key"),
  ]);
  return {
    permissions: (permissions ?? []) as Array<{
      key: string;
      description_ar: string;
      category: string | null;
      module_name: string | null;
      sub_module_name: string | null;
      action: string | null;
      sort_order: number | null;
    }>,
    rolePermissions: (rolePermissions ?? []).map((r) => ({
      role: r.role as AppRole,
      key: r.permission_key,
    })),
  };
}

/** Admin-only: grant or revoke many permissions for one role in a single call. */
export async function bulkSetRolePermissions(
  supabase: Db,
  actorId: string,
  role: AppRole,
  permissionKeys: string[],
  granted: boolean,
) {
  const { data, error } = await (supabase as any).rpc("admin_set_role_permissions_bulk", {
    _role: role,
    _permission_keys: permissionKeys,
    _granted: granted,
  });
  if (error) throw new Error("تعذّر تحديث الصلاحيات.");

  await recordAudit({
    userId: actorId,
    action: granted ? "permissions.bulk_grant" : "permissions.bulk_revoke",
    entity: "role_permissions",
    entityId: role,
    metadata: { role, count: permissionKeys.length, granted },
    meta: getRequestMeta(),
  });
  return { ok: true as const, affected: Number(data ?? 0) };
}

export async function setRolePermission(
  supabase: Db,
  actorId: string,
  role: AppRole,
  permissionKey: string,
  granted: boolean,
) {
  const { error } = await (supabase as any).rpc("admin_set_role_permission", {
    _role: role,
    _permission_key: permissionKey,
    _granted: granted,
  });
  if (error) throw new Error("تعذّر تحديث الصلاحية.");

  await recordAudit({
    userId: actorId,
    action: granted ? "permissions.grant" : "permissions.revoke",
    entity: "role_permissions",
    entityId: `${role}:${permissionKey}`,
    metadata: { role, permissionKey, granted },
    meta: getRequestMeta(),
  });
  return { ok: true as const };
}

export async function listUserPermissionOverrides(supabase: Db) {
  const { data } = await (supabase as any)
    .from("user_permissions")
    .select("user_id, permission_key, granted");
  return ((data ?? []) as Array<{ user_id: string; permission_key: string; granted: boolean }>).map(
    (row) => ({ userId: row.user_id, key: row.permission_key, granted: row.granted }),
  );
}

export async function bulkSetUserPermissions(
  supabase: Db,
  actorId: string,
  userIds: string[],
  permissionKeys: string[],
  action: "grant" | "revoke" | "reset",
) {
  const { data, error } = await (supabase as any).rpc("admin_bulk_set_user_permissions", {
    _user_ids: userIds,
    _permission_keys: permissionKeys,
    _action: action,
  });
  if (error) throw new Error("تعذّر تنفيذ الإجراء الجماعي على الصلاحيات.");

  await recordAudit({
    userId: actorId,
    action: `permissions.bulk.${action}`,
    entity: "user_permissions",
    metadata: { userIds, permissionKeys, action, affected: data ?? 0 },
    meta: getRequestMeta(),
  });
  return { ok: true as const, affected: (data as number) ?? 0 };
}
