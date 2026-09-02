import { z } from "zod";

export const roleAssignmentSchema = z.object({
  userId: z.string().uuid(),
  roles: z
    .array(
      z.enum([
        "parent",
        "registration_officer",
        "accountant",
        "principal",
        "supervisor",
        "admin",
        "teacher",
      ]),
    )
    .min(1, "يجب اختيار دور واحد على الأقل")
    .max(7),
});

export type RoleAssignmentInput = z.infer<typeof roleAssignmentSchema>;

export const rolePermissionSchema = z.object({
  role: z.enum([
    "parent",
    "registration_officer",
    "accountant",
    "principal",
    "supervisor",
    "admin",
    "teacher",
  ]),
  permissionKey: z.string().min(1).max(120),
  granted: z.boolean(),
});

export type RolePermissionInput = z.infer<typeof rolePermissionSchema>;

export const bulkRolePermissionSchema = z.object({
  role: z.enum([
    "parent",
    "registration_officer",
    "accountant",
    "principal",
    "supervisor",
    "admin",
    "teacher",
  ]),
  permissionKeys: z.array(z.string().min(1).max(120)).min(1).max(500),
  granted: z.boolean(),
});

export type BulkRolePermissionInput = z.infer<typeof bulkRolePermissionSchema>;


export const bulkUserPermissionSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "اختر مستخدمًا واحدًا على الأقل").max(200),
  permissionKeys: z.array(z.string().min(1).max(120)).min(1, "اختر صلاحية واحدة على الأقل").max(60),
  action: z.enum(["grant", "revoke", "reset"]),
});

export type BulkUserPermissionInput = z.infer<typeof bulkUserPermissionSchema>;