/** Shared role gates for the finance module (AMS side). */

const VIEW_ROLES = ["accountant", "admin", "principal", "supervisor", "registration_officer"];
const MANAGE_ROLES = ["accountant", "admin"];

export function canViewFinance(roles: readonly string[]) {
  return roles.some((r) => VIEW_ROLES.includes(r));
}

export function canManageFinance(roles: readonly string[]) {
  return roles.some((r) => MANAGE_ROLES.includes(r));
}
