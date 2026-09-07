/**
 * Server-only service for the Qurra monthly payment board.
 *
 * Only finance staff may read or write these rows (RLS also restricts the table
 * to school staff). The list of covered children comes from approved
 * applications whose Qurra request was approved.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { ACADEMIC_YEAR } from "./finance.server";
import { QURRA_MONTHS, emptyCell, type QurraBoard, type QurraStudentRow } from "./qurra";

type Db = SupabaseClient<Database>;

const VIEW_ROLES: AppRole[] = ["admin", "principal", "supervisor", "accountant", "registration_officer"];
const MANAGE_ROLES: AppRole[] = ["admin", "accountant"];

async function rolesOf(supabase: Db, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

async function guard(supabase: Db, userId: string, manage: boolean) {
  const roles = await rolesOf(supabase, userId);
  const allowed = manage ? MANAGE_ROLES : VIEW_ROLES;
  if (!roles.some((r) => allowed.includes(r))) {
    throw new Error(
      manage
        ? "تعديل بيانات قرة متاح لقسم الحسابات ومدير النظام فقط."
        : "هذا القسم متاح للحسابات والإدارة فقط.",
    );
  }
}

/** Full board: covered children as rows, months as columns. */
export async function getQurraBoard(
  supabase: Db,
  userId: string,
  input: { academicYear?: string | null },
): Promise<QurraBoard> {
  await guard(supabase, userId, false);

  const { data: qurraRows } = await supabase
    .from("qurra_requests")
    .select("application_id, status")
    .eq("status", "approved")
    .limit(2000);

  const appIds = [...new Set((qurraRows ?? []).map((q) => q.application_id).filter(Boolean))] as string[];

  const { data: apps } = appIds.length
    ? await supabase
        .from("applications")
        .select("id, academic_year, parent_id, status, student_number")
        .in("id", appIds)
        .eq("status", "approved")
    : { data: [] as { id: string; academic_year: string; parent_id: string; status: string; student_number: string | null }[] };

  const years = [...new Set((apps ?? []).map((a) => a.academic_year).filter(Boolean))].sort().reverse();
  const academicYear = input.academicYear || years[0] || ACADEMIC_YEAR;
  const scopedApps = (apps ?? []).filter((a) => a.academic_year === academicYear);
  const scopedAppIds = scopedApps.map((a) => a.id);

  const { data: children } = scopedAppIds.length
    ? await supabase
        .from("application_children")
        .select("id, name_ar, application_id, stage_id, classroom_id")
        .in("application_id", scopedAppIds)
    : { data: [] as Record<string, string | null>[] };

  const childRows = (children ?? []) as unknown as {
    id: string;
    name_ar: string;
    application_id: string;
    stage_id: string | null;
    classroom_id: string | null;
  }[];

  const parentIds = [...new Set(scopedApps.map((a) => a.parent_id).filter(Boolean))];
  const [{ data: stages }, { data: classrooms }, { data: profiles }, { data: plans }, { data: payments }] =
    await Promise.all([
      supabase.from("stages").select("id, name_ar"),
      supabase.from("classrooms").select("id, name_ar, stage_id"),
      parentIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", parentIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      supabase.from("fee_plans").select("*").eq("is_active", true),
      supabase
        .from("qurra_monthly_payments")
        .select("*")
        .eq("academic_year", academicYear)
        .limit(5000),
    ]);

  const stageName = new Map((stages ?? []).map((s) => [s.id, s.name_ar]));
  const classroomRow = new Map((classrooms ?? []).map((c) => [c.id, c]));
  const parentName = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? null]));
  const appById = new Map(scopedApps.map((a) => [a.id, a]));

  /** Monthly tuition guess used to prefill the "due" cell hint. */
  const monthlyFeeFor = (stageId: string | null, classroomId: string | null) => {
    const rows = (plans ?? []) as unknown as {
      stage_id: string | null;
      classroom_id: string | null;
      amount: number;
      unit: string;
      months_per_year: number;
      terms_per_year: number;
    }[];
    const plan =
      rows.find((p) => classroomId && p.classroom_id === classroomId) ??
      rows.find((p) => stageId && p.stage_id === stageId && !p.classroom_id) ??
      rows.find((p) => !p.stage_id && !p.classroom_id);
    if (!plan) return 0;
    const months = Math.max(1, plan.months_per_year || 10);
    const amount = Number(plan.amount) || 0;
    if (plan.unit === "month") return amount;
    if (plan.unit === "year") return Math.round(amount / months);
    if (plan.unit === "term") return Math.round((amount * (plan.terms_per_year || 2)) / months);
    if (plan.unit === "two_terms") return Math.round((amount * 2) / months);
    return amount;
  };

  const paymentRows = (payments ?? []) as unknown as {
    child_id: string;
    month: number;
    due_amount: number;
    transferred_amount: number;
    confirmed: boolean;
    confirmed_at: string | null;
    note: string | null;
  }[];

  const rows: QurraStudentRow[] = childRows.map((child) => {
    const classroom = child.classroom_id ? classroomRow.get(child.classroom_id) : null;
    const app = appById.get(child.application_id);
    const cells: Record<number, ReturnType<typeof emptyCell>> = {};
    for (const m of QURRA_MONTHS) cells[m.month] = emptyCell(m.month);
    for (const p of paymentRows) {
      if (p.child_id !== child.id) continue;
      cells[p.month] = {
        month: p.month,
        dueAmount: Number(p.due_amount) || 0,
        transferredAmount: Number(p.transferred_amount) || 0,
        confirmed: Boolean(p.confirmed),
        confirmedAt: p.confirmed_at,
        note: p.note,
      };
    }
    const list = Object.values(cells);
    return {
      childId: child.id,
      name: child.name_ar,
      academicNumber: app?.student_number ?? null,
      stageName: (child.stage_id ? stageName.get(child.stage_id) : null) ?? null,
      classroomName: classroom?.name_ar ?? null,
      parentName: (app ? parentName.get(app.parent_id) : null) ?? null,
      monthlyFee: monthlyFeeFor(child.stage_id, child.classroom_id),
      cells,
      totalDue: list.reduce((s, c) => s + c.dueAmount, 0),
      totalTransferred: list.reduce((s, c) => s + c.transferredAmount, 0),
      totalConfirmed: list.reduce((s, c) => s + (c.confirmed ? c.transferredAmount : 0), 0),
    };
  });

  rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const due = rows.reduce((s, r) => s + r.totalDue, 0);
  const transferred = rows.reduce((s, r) => s + r.totalTransferred, 0);
  const confirmed = rows.reduce((s, r) => s + r.totalConfirmed, 0);

  return {
    academicYear,
    academicYears: years.length ? years : [academicYear],
    rows,
    totals: {
      due,
      transferred,
      confirmed,
      students: rows.length,
      remaining: Math.max(0, due - transferred),
    },
  };
}

/** Create or update one month cell for one child. */
export async function saveQurraCell(
  supabase: Db,
  userId: string,
  input: {
    childId: string;
    academicYear: string;
    month: number;
    dueAmount?: number | null;
    transferredAmount?: number | null;
    confirmed?: boolean | null;
    note?: string | null;
  },
) {
  await guard(supabase, userId, true);

  const { data: existing } = await supabase
    .from("qurra_monthly_payments")
    .select("*")
    .eq("child_id", input.childId)
    .eq("academic_year", input.academicYear)
    .eq("month", input.month)
    .maybeSingle();

  const due = input.dueAmount ?? Number(existing?.due_amount ?? 0);
  const transferred = input.transferredAmount ?? Number(existing?.transferred_amount ?? 0);
  const confirmed = input.confirmed ?? Boolean(existing?.confirmed ?? false);
  const note = input.note ?? existing?.note ?? null;

  const payload = {
    child_id: input.childId,
    academic_year: input.academicYear,
    month: input.month,
    due_amount: Math.max(0, Number(due) || 0),
    transferred_amount: Math.max(0, Number(transferred) || 0),
    confirmed,
    confirmed_at: confirmed ? (existing?.confirmed_at ?? new Date().toISOString()) : null,
    note,
    recorded_by: userId,
  };

  if (existing) {
    const { error } = await supabase
      .from("qurra_monthly_payments")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("qurra_monthly_payments").insert(payload);
    if (error) throw new Error(error.message);
  }

  return { ok: true };
}

/** Fill the "due" cell of every covered child for one month with the monthly tuition. */
export async function prefillQurraMonth(
  supabase: Db,
  userId: string,
  input: { academicYear: string; month: number },
) {
  await guard(supabase, userId, true);
  const board = await getQurraBoard(supabase, userId, { academicYear: input.academicYear });
  let count = 0;
  for (const row of board.rows) {
    const cell = row.cells[input.month];
    if (!row.monthlyFee || (cell && cell.dueAmount > 0)) continue;
    await saveQurraCell(supabase, userId, {
      childId: row.childId,
      academicYear: input.academicYear,
      month: input.month,
      dueAmount: row.monthlyFee,
    });
    count += 1;
  }
  return { updated: count };
}
