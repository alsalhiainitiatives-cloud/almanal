import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./service.server";
import {
  deleteCustomRole,
  listCustomRoleMatrix,
  setCustomRolePermissions,
  setUserCustomRoles,
  upsertCustomRole,
} from "./custom-roles.server";

const customRoleSchema = z.object({
  id: z.string().uuid().nullish(),
  nameAr: z.string().trim().min(2, "اكتب اسم الدور").max(80),
  descriptionAr: z.string().trim().max(400).default(""),
  color: z.string().trim().max(120).default("bg-lavender/70 text-foreground"),
  isActive: z.boolean().default(true),
});

const rolePermissionsSchema = z.object({
  customRoleId: z.string().uuid(),
  permissionKeys: z.array(z.string().min(1).max(120)).max(500),
});

const userCustomRolesSchema = z.object({
  userId: z.string().uuid(),
  customRoleIds: z.array(z.string().uuid()).max(30),
});

export const getCustomRoleMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listCustomRoleMatrix(context.supabase));

export const adminUpsertCustomRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => customRoleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return upsertCustomRole(context.supabase, context.userId, {
      id: data.id ?? null,
      nameAr: data.nameAr,
      descriptionAr: data.descriptionAr,
      color: data.color,
      isActive: data.isActive,
    });
  });

export const adminDeleteCustomRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return deleteCustomRole(context.supabase, context.userId, data.id);
  });

export const adminSetCustomRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rolePermissionsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return setCustomRolePermissions(
      context.supabase,
      context.userId,
      data.customRoleId,
      data.permissionKeys,
    );
  });

export const adminSetUserCustomRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => userCustomRolesSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return setUserCustomRoles(context.supabase, context.userId, data.userId, data.customRoleIds);
  });
