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
      ]),
    )
    .min(1, "يجب اختيار دور واحد على الأقل")
    .max(6),
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
  ]),
  permissionKey: z.string().min(1).max(120),
  granted: z.boolean(),
});

export type RolePermissionInput = z.infer<typeof rolePermissionSchema>;