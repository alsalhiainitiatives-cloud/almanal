/**
 * Server-only Student Withdrawals service.
 *
 * A withdrawal moves a student out of the active registry: pending records track
 * the financial settlement, and confirming one stamps `withdrawn_at` on the
 * child so they disappear from classrooms, attendance, assessments and reports
 * while remaining available as a withdrawn / graduated record with an official
 * "duration of enrolment" certificate.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { ensureCapability } from "./capability-guard.server";
import type { Capability } from "./roles";

type Db = SupabaseClient<Database>;

async function guard(supabase: Db, userId: string, capability: Capability) {
  return ensureCapability(supabase, userId, capability, "ليس لديك صلاحية إدارة انسحاب الطلاب.");
}

const CHILD_SELECT = `
  id, name_ar, name_en, national_id, gender, birth_date, nationality, stage_id, classroom_id,
  withdrawn_at, created_at,
  applications!inner ( id, application_number, student_number, academic_year, status,
    parent_id, parent_relationship, submitted_at, decided_at, created_at, draft_data )
`;

type AppJoin = {
  id: string;
  application_number: string | null;
  student_number: string | null;
  academic_year: string;
  status: string;
  parent_id: string;
  parent_relationship: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  draft_data: Record<string, unknown> | null;
};

const parentOf = (draft: Record<string, unknown> | null) =>
  (draft?.parent ?? null) as { fullName?: string; mobile?: string; email?: string } | null;

/** Outstanding balance across every invoice of an application. */
async function outstandingFor(supabase: Db, applicationId: string) {
  const { data } = await supabase
    .from("invoices")
    .select("grand_total, paid_total")
    .eq("application_id", applicationId);
  const rows = data ?? [];
  const total = rows.reduce((sum, r) => sum + Number(r.grand_total ?? 0), 0);
  const paid = rows.reduce((sum, r) => sum + Number(r.paid_total ?? 0), 0);
  return { total, paid, outstanding: Math.max(0, total - paid) };
}

/** Withdrawal records + the students still eligible to be withdrawn. */
export async function listWithdrawals(supabase: Db, userId: string) {
  await guard(supabase, userId, "view");

  const [{ data: records, error }, { data: stages }, { data: classrooms }] = await Promise.all([
    supabase
      .from("student_withdrawals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("stages").select("id, name_ar").order("sort_order"),
    supabase.from("classrooms").select("id, name_ar, stage_id").order("sort_order"),
  ]);
  if (error) throw new Error("تعذّر تحميل سجل الانسحاب.");

  const childIds = [...new Set((records ?? []).map((r) => r.child_id))];
  const { data: children } = childIds.length
    ? await supabase.from("application_children").select(CHILD_SELECT).in("id", childIds)
    : { data: [] as unknown[] };

  const childById = new Map(
    (children ?? []).map((row) => {
      const child = row as unknown as {
        id: string;
        name_ar: string;
        national_id: string | null;
        gender: string | null;
        birth_date: string | null;
        withdrawn_at: string | null;
        applications: unknown;
      };
      const app = child.applications as unknown as AppJoin;
      return [
        child.id,
        {
          name_ar: child.name_ar,
          national_id: child.national_id,
          gender: child.gender,
          birth_date: child.birth_date,
          withdrawn_at: child.withdrawn_at,
          studentNumber: app.student_number ?? app.application_number,
          parentName: parentOf(app.draft_data)?.fullName ?? null,
          parentPhone: parentOf(app.draft_data)?.mobile ?? null,
        },
      ] as const;
    }),
  );

  const staffIds = [
    ...new Set(
      (records ?? []).flatMap((r) => [r.requested_by, r.confirmed_by].filter(Boolean) as string[]),
    ),
  ];
  const { data: staff } = staffIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", staffIds)
    : { data: [] as { id: string; full_name: string }[] };
  const staffById = new Map((staff ?? []).map((s) => [s.id, s.full_name]));

  return {
    records: (records ?? []).map((r) => ({
      ...r,
      child: childById.get(r.child_id) ?? null,
      requestedByName: r.requested_by ? (staffById.get(r.requested_by) ?? null) : null,
      confirmedByName: r.confirmed_by ? (staffById.get(r.confirmed_by) ?? null) : null,
    })),
    stages: stages ?? [],
    classrooms: classrooms ?? [],
  };
}

export type WithdrawalInput = {
  childId: string;
  kind: "withdrawal" | "graduation";
  reason: string;
  reasonNote?: string | null;
  destinationSchool?: string | null;
  effectiveDate?: string | null;
  financeNote?: string | null;
  notes?: string | null;
};

/** Opens a withdrawal file for a student and snapshots the financial position. */
export async function createWithdrawal(supabase: Db, userId: string, input: WithdrawalInput) {
  await guard(supabase, userId, "seats");

  const { data: row, error } = await supabase
    .from("application_children")
    .select(CHILD_SELECT)
    .eq("id", input.childId)
    .maybeSingle();
  if (error || !row) throw new Error("الطالب غير موجود.");
  const child = row as unknown as {
    id: string;
    stage_id: string | null;
    classroom_id: string | null;
    withdrawn_at: string | null;
    applications: unknown;
  };
  if (child.withdrawn_at) throw new Error("هذا الطالب منسحب بالفعل.");
  const app = child.applications as unknown as AppJoin;

  const { data: existing } = await supabase
    .from("student_withdrawals")
    .select("id, status")
    .eq("child_id", input.childId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (existing) throw new Error("يوجد طلب انسحاب مفتوح لهذا الطالب.");

  const finance = await outstandingFor(supabase, app.id);

  const { data: created, error: insertError } = await supabase
    .from("student_withdrawals")
    .insert({
      child_id: input.childId,
      application_id: app.id,
      academic_year: app.academic_year,
      stage_id: child.stage_id,
      classroom_id: child.classroom_id,
      kind: input.kind,
      reason: input.reason,
      reason_note: input.reasonNote ?? null,
      destination_school: input.destinationSchool ?? null,
      effective_date: input.effectiveDate ?? null,
      finance_outstanding: finance.outstanding,
      finance_cleared: finance.outstanding <= 0,
      finance_note: input.financeNote ?? null,
      notes: input.notes ?? null,
      enrolled_from: (app.decided_at ?? app.submitted_at ?? app.created_at).slice(0, 10),
      requested_by: userId,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertError || !created) throw new Error("تعذّر تسجيل طلب الانسحاب.");

  return { ok: true as const, id: created.id, outstanding: finance.outstanding };
}

export async function updateWithdrawal(
  supabase: Db,
  userId: string,
  input: {
    id: string;
    reason?: string;
    reasonNote?: string | null;
    destinationSchool?: string | null;
    effectiveDate?: string | null;
    financeCleared?: boolean;
    financeNote?: string | null;
    notes?: string | null;
    refreshFinance?: boolean;
  },
) {
  await guard(supabase, userId, "seats");

  const { data: record } = await supabase
    .from("student_withdrawals")
    .select("id, application_id, status")
    .eq("id", input.id)
    .maybeSingle();
  if (!record) throw new Error("طلب الانسحاب غير موجود.");

  const patch: Record<string, unknown> = {};
  if (input.reason !== undefined) patch.reason = input.reason;
  if (input.reasonNote !== undefined) patch.reason_note = input.reasonNote;
  if (input.destinationSchool !== undefined) patch.destination_school = input.destinationSchool;
  if (input.effectiveDate !== undefined) patch.effective_date = input.effectiveDate;
  if (input.financeCleared !== undefined) patch.finance_cleared = input.financeCleared;
  if (input.financeNote !== undefined) patch.finance_note = input.financeNote;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.refreshFinance) {
    const finance = await outstandingFor(supabase, record.application_id);
    patch.finance_outstanding = finance.outstanding;
    if (finance.outstanding <= 0) patch.finance_cleared = true;
  }

  const { error } = await supabase.from("student_withdrawals").update(patch).eq("id", input.id);
  if (error) throw new Error("تعذّر تحديث طلب الانسحاب.");
  return { ok: true as const };
}

async function nextCertificateNumber(supabase: Db) {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("student_withdrawals")
    .select("id", { count: "exact", head: true })
    .not("certificate_number", "is", null);
  return `WD-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

/** Confirms the withdrawal: the student leaves classrooms, attendance and assessments. */
export async function confirmWithdrawal(
  supabase: Db,
  userId: string,
  input: { id: string; force?: boolean },
) {
  await guard(supabase, userId, "archive");

  const { data: record } = await supabase
    .from("student_withdrawals")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (!record) throw new Error("طلب الانسحاب غير موجود.");
  if (record.status === "confirmed") throw new Error("تم تأكيد هذا الانسحاب مسبقًا.");

  const finance = await outstandingFor(supabase, record.application_id);
  if (finance.outstanding > 0 && !record.finance_cleared && !input.force)
    throw new Error(
      `لا يمكن تأكيد الانسحاب قبل تسوية المبلغ المتبقي (${finance.outstanding.toLocaleString("ar-SA")} ريال).`,
    );

  const now = new Date().toISOString();
  const effective = record.effective_date ?? now.slice(0, 10);
  const certificate = record.certificate_number ?? (await nextCertificateNumber(supabase));

  const { error } = await supabase
    .from("student_withdrawals")
    .update({
      status: "confirmed",
      confirmed_by: userId,
      confirmed_at: now,
      effective_date: effective,
      finance_outstanding: finance.outstanding,
      finance_cleared: finance.outstanding <= 0 ? true : record.finance_cleared,
      certificate_number: certificate,
      certificate_issued_at: record.certificate_issued_at ?? now,
    })
    .eq("id", input.id);
  if (error) throw new Error("تعذّر تأكيد الانسحاب.");

  const { error: childError } = await supabase
    .from("application_children")
    .update({ withdrawn_at: new Date(`${effective}T00:00:00Z`).toISOString() })
    .eq("id", record.child_id);
  if (childError) throw new Error("تعذّر تحديث حالة الطالب.");

  // Free the seat and keep occupancy counters accurate.
  await supabase.rpc("recount_classroom_seats");
  await supabase.rpc("recount_stage_seats");

  // When no active child remains, the whole application becomes withdrawn.
  const { count: activeSiblings } = await supabase
    .from("application_children")
    .select("id", { count: "exact", head: true })
    .eq("application_id", record.application_id)
    .is("withdrawn_at", null);
  if ((activeSiblings ?? 0) === 0)
    await supabase.from("applications").update({ status: "withdrawn" }).eq("id", record.application_id);

  return { ok: true as const, certificateNumber: certificate };
}

/** Reverses a withdrawal — the student returns to the active registry. */
export async function cancelWithdrawal(supabase: Db, userId: string, input: { id: string }) {
  await guard(supabase, userId, "archive");

  const { data: record } = await supabase
    .from("student_withdrawals")
    .select("id, child_id, application_id, status")
    .eq("id", input.id)
    .maybeSingle();
  if (!record) throw new Error("طلب الانسحاب غير موجود.");

  const { error } = await supabase
    .from("student_withdrawals")
    .update({ status: "cancelled", confirmed_by: userId, confirmed_at: new Date().toISOString() })
    .eq("id", input.id);
  if (error) throw new Error("تعذّر إلغاء الانسحاب.");

  await supabase
    .from("application_children")
    .update({ withdrawn_at: null })
    .eq("id", record.child_id);
  await supabase.from("applications").update({ status: "approved" }).eq("id", record.application_id);
  await supabase.rpc("recount_classroom_seats");
  await supabase.rpc("recount_stage_seats");

  return { ok: true as const };
}

/** Deletes a withdrawal file (cancelled / mistaken records only). */
export async function deleteWithdrawal(supabase: Db, userId: string, input: { id: string }) {
  await guard(supabase, userId, "archive");
  const { data: record } = await supabase
    .from("student_withdrawals")
    .select("id, status, child_id")
    .eq("id", input.id)
    .maybeSingle();
  if (!record) throw new Error("طلب الانسحاب غير موجود.");
  if (record.status === "confirmed")
    throw new Error("ألغِ الانسحاب أولًا قبل حذف السجل حتى يعود الطالب للسجل النشط.");
  const { error } = await supabase.from("student_withdrawals").delete().eq("id", input.id);
  if (error) throw new Error("تعذّر حذف السجل.");
  return { ok: true as const };
}

export type WithdrawalCertificate = Awaited<ReturnType<typeof buildCertificate>>;

/** Everything the printable "duration of enrolment" certificate needs. */
export async function buildCertificate(supabase: Db, userId: string, id: string) {
  await guard(supabase, userId, "view");

  const { data: record } = await supabase
    .from("student_withdrawals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!record) throw new Error("طلب الانسحاب غير موجود.");

  const { data: row } = await supabase
    .from("application_children")
    .select(CHILD_SELECT)
    .eq("id", record.child_id)
    .maybeSingle();
  if (!row) throw new Error("لم يتم العثور على ملف الطالب.");
  const child = row as unknown as {
    id: string;
    name_ar: string;
    name_en: string | null;
    national_id: string | null;
    gender: string | null;
    birth_date: string | null;
    nationality: string | null;
    stage_id: string | null;
    classroom_id: string | null;
    applications: unknown;
  };
  const app = child.applications as unknown as AppJoin;
  const parent = parentOf(app.draft_data);

  const classroomId = record.classroom_id ?? child.classroom_id;

  const [stage, classroom, attendance, finance, subjects, assessments] = await Promise.all([
    (record.stage_id ?? child.stage_id)
      ? supabase
          .from("stages")
          .select("name_ar, age_label")
          .eq("id", (record.stage_id ?? child.stage_id) as string)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    classroomId
      ? supabase.from("classrooms").select("name_ar").eq("id", classroomId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("attendance_records").select("status").eq("child_id", child.id),
    outstandingFor(supabase, app.id),
    classroomId
      ? supabase
          .from("subjects")
          .select("id, name_ar, topics ( id, name_ar, lessons ( id, name_ar ) )")
          .eq("classroom_id", classroomId)
          .order("sort_order")
      : Promise.resolve({ data: [] as unknown[] }),
    supabase.from("lesson_assessments").select("lesson_id").eq("child_id", child.id),
  ]);

  const days = attendance.data ?? [];
  const countBy = (status: string) => days.filter((d) => d.status === status).length;
  const assessedLessons = new Set((assessments.data ?? []).map((a) => a.lesson_id));

  type SubjectRow = {
    id: string;
    name_ar: string;
    topics: { id: string; name_ar: string; lessons: { id: string; name_ar: string }[] | null }[] | null;
  };
  const curriculum = ((subjects.data ?? []) as unknown as SubjectRow[]).map((s) => ({
    subject: s.name_ar,
    topics: (s.topics ?? []).map((t) => ({
      topic: t.name_ar,
      lessons: (t.lessons ?? []).map((l) => ({
        name: l.name_ar,
        studied: assessedLessons.has(l.id),
      })),
    })),
  }));

  return {
    record,
    student: {
      name_ar: child.name_ar,
      name_en: child.name_en,
      national_id: child.national_id,
      gender: child.gender,
      birth_date: child.birth_date,
      nationality: child.nationality,
      studentNumber: app.student_number ?? app.application_number,
      academicYear: app.academic_year,
      stage: stage.data?.name_ar ?? null,
      stageAge: (stage.data as { age_label?: string | null } | null)?.age_label ?? null,
      classroom: classroom.data?.name_ar ?? null,
      parentName: parent?.fullName ?? null,
      parentPhone: parent?.mobile ?? null,
      parentRelationship: app.parent_relationship,
    },
    attendance: {
      total: days.length,
      present: countBy("present"),
      absent: countBy("absent"),
      late: countBy("late"),
      excused: countBy("excused"),
    },
    finance,
    curriculum,
  };
}
