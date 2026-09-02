import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bulkRolePermissionSchema,
  bulkUserPermissionSchema,
  rolePermissionSchema,
  roleAssignmentSchema,
} from "./admin-schemas";
import {
  assertAdmin,
  bulkSetRolePermissions,
  bulkSetUserPermissions,
  listAuditEntries,
  listRolePermissionMatrix,
  listUserPermissionOverrides,
  listUsersWithRoles,
  replaceUserRoles,
  setRolePermission,
} from "./service.server";

export const adminBulkSetRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bulkRolePermissionSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return bulkSetRolePermissions(
      context.supabase,
      context.userId,
      data.role,
      data.permissionKeys,
      data.granted,
    );
  });


export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return listUsersWithRoles(context.supabase);
  });

export const adminSetUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roleAssignmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return replaceUserRoles(context.supabase, context.userId, data.userId, data.roles);
  });

export const adminListAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return listAuditEntries(context.supabase, 100);
  });

export const getRolePermissionMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listRolePermissionMatrix(context.supabase));

export const adminListUserPermissionOverrides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return listUserPermissionOverrides(context.supabase);
  });

export const adminBulkSetUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bulkUserPermissionSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return bulkSetUserPermissions(
      context.supabase,
      context.userId,
      data.userIds,
      data.permissionKeys,
      data.action,
    );
  });

export const adminSetRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rolePermissionSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return setRolePermission(
      context.supabase,
      context.userId,
      data.role,
      data.permissionKey,
      data.granted,
    );
  });