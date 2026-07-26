import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { roleAssignmentSchema } from "./admin-schemas";
import {
  assertAdmin,
  listAuditEntries,
  listRolePermissionMatrix,
  listUsersWithRoles,
  replaceUserRoles,
} from "./service.server";

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
    return replaceUserRoles(context.userId, data.userId, data.roles);
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