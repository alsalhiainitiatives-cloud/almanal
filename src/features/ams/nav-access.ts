/**
 * Navigation access map (client-side UI gating only; RLS still enforces data).
 *
 * A module tab is visible when the user holds ANY of its permissions, so a role
 * (e.g. teacher) granted permissions inside Student Affairs sees that module —
 * while the links inside it stay filtered by their own permissions.
 */

/** Roles that always see everything (system owners). */
export const SUPER_ROLES = ["admin", "supervisor"];

export const MODULE_PERMISSIONS: Record<string, string[]> = {
  "/ams": [
    "applications.view",
    "applications.review",
    "applications.approve",
    "admissions.view",
    "admissions.review",
    "enrollment.manage",
  ],
  "/ams/students": [
    "students.view",
    "students.create",
    "students.edit",
    "students.import",
    "students.export",
    "attendance.view",
    "attendance.record",
    "guardians.link",
    "guardians.invite",
    "classrooms.assign",
  ],
  "/ams/academics": [
    "curriculum.view",
    "assessments.view",
    "study_plan.view",
    "class_chat.view",
    "academic_reports.view",
    "teacher_assignments.view",
  ],
  "/ams/finance": ["invoices.view", "payments.manage", "receipts.print", "reports.financial"],
  "/ams/website": ["website.content_manage", "inbox.view", "reviews.moderate"],
  "/ams/system": [
    "users.view",
    "roles.manage",
    "permissions.manage",
    "audit.view",
    "settings.manage",
  ],
};

/** Per-link permissions inside each module (any-of). */
export const LINK_PERMISSIONS: Record<string, string[]> = {
  // Admissions
  "/ams": MODULE_PERMISSIONS["/ams"]!,
  "/ams/reservations": ["applications.view", "applications.review"],
  "/ams/queue": ["applications.view", "applications.review"],
  "/ams/waiting-list": ["applications.view", "enrollment.manage"],
  "/ams/activity": ["applications.view", "reports.view"],
  "/ams/reports": ["reports.view", "applications.view"],
  "/ams/seasons": ["settings.manage"],
  "/ams/form-builder": ["settings.manage"],

  // Student affairs
  "/ams/students": ["students.view", "attendance.view", "guardians.link", "students.import"],
  "/ams/students/registry": ["students.view"],
  "/ams/seats": ["classrooms.assign", "enrollment.manage", "students.view"],
  "/ams/students/attendance": ["attendance.view", "attendance.record", "attendance.export"],
  "/ams/students/guardians": ["guardians.link", "guardians.invite"],
  "/ams/students/data": ["students.import", "students.export", "students.create", "students.edit"],
  "/ams/students/promotions": ["enrollment.manage", "students.edit"],

  // Academics
  "/ams/academics": MODULE_PERMISSIONS["/ams/academics"]!,
  "/ams/academics/chat": ["class_chat.view"],
  "/ams/academics/curriculum": ["curriculum.view"],
  "/ams/academics/plans": ["study_plan.view"],
  "/ams/academics/calendar": ["study_plan.view", "attendance.view", "class_chat.view"],
  "/ams/academics/assignments": ["teacher_assignments.view", "teacher_assignments.manage"],
  "/ams/academics/assessments": ["assessments.view"],
  "/ams/academics/reports": ["academic_reports.view"],
  "/ams/academics/settings": ["settings.manage"],

  // Finance
  "/ams/finance": ["invoices.view", "payments.manage", "reports.financial"],
  "/ams/finance/invoices": ["invoices.view", "payments.manage"],
  "/ams/finance/claims": ["payments.manage"],
  "/ams/finance/reports": ["reports.financial"],
  "/ams/finance/settings": ["settings.manage", "payments.manage"],

  // Website
  "/ams/website": ["website.content_manage", "inbox.view", "reviews.moderate"],
  "/ams/website/settings": ["website.content_manage"],
  "/ams/website/inbox": ["inbox.view"],
  "/ams/website/reviews": ["reviews.moderate"],

  // System
  "/ams/system": ["settings.manage", "users.view", "audit.view", "permissions.manage"],
  "/ams/system/users": ["users.view"],
  "/ams/system/permissions": ["permissions.manage", "roles.manage"],
  "/ams/system/audit": ["audit.view"],
  "/ams/system/registration": ["settings.manage"],
};

export function isSuperRole(roles: readonly string[]): boolean {
  return roles.some((role) => SUPER_ROLES.includes(role));
}

/** Visible when super role, no gate configured, or any listed permission is held. */
export function canSeeLink(
  to: string,
  roles: readonly string[],
  permissions: readonly string[],
): boolean {
  if (isSuperRole(roles)) return true;
  const required = LINK_PERMISSIONS[to];
  if (!required || required.length === 0) return true;
  return required.some((code) => permissions.includes(code));
}
