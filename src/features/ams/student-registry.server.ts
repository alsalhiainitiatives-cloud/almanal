/**
 * Server-only Student Registry service: bulk import of legacy students plus
 * direct create / edit / delete from the Student Affairs data sheet.
 *
 * Imported students become approved applications owned by the importing staff
 * member (the real guardian data lives in `draft_data.parent`), and each one
 * receives an official academic number issued by the shared counter.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { issueAcademicNumber } from "./academic-number.server";
import { ensureCapability } from "./capability-guard.server";
import type { Capability } from "./roles";
import type { StudentRecord } from "./student-import";

type Db = SupabaseClient<Database>;

async function guard(supabase: Db, userId: string, capability: Capability) {
  return ensureCapability(supabase, userId, capability, "ليس لديك صلاحية إدارة سجل الطلاب.");
}

const childPatch = (record: StudentRecord) => ({
  name_ar: record.name_ar,
  name_en: record.name_en ?? null,
  national_id: record.national_id ?? null,
  gender: record.gender,
  birth_date: record.birth_date,
  nationality: record.nationality ?? null,
  birth_place: record.birth_place ?? null,
  blood_type: record.blood_type ?? null,
  medical_conditions: record.medical_conditions ?? null,
  allergies: record.allergies ?? null,
  special_needs: record.special_needs ?? null,
  previous_school: record.previous_school ?? null,
  last_grade: record.last_grade ?? null,
  vaccination_status: record.vaccination_status ?? null,
  stage_id: record.stage_id,
  classroom_id: record.classroom_id ?? null,
});

const parentDraft = (record: StudentRecord) => ({
  parent: {
    fullName: record.parent_name,
    mobile: record.parent_phone,
    email: record.parent_email ?? null,
  },
  imported: true,
  notes: record.notes ?? null,
});

/** Creates one approved student record and returns its academic number. */
async function createStudent(
  supabase: Db,
  userId: string,
  record: StudentRecord,
  academicYear: string,
  seasonId: string | null,
) {
  const now = new Date().toISOString();
  const { data: app, error } = await supabase
    .from("applications")
    .insert({
      parent_id: userId,
      stage_id: record.stage_id,
      classroom_id: record.classroom_id ?? null,
      academic_year: academicYear,
      status: "approved",
      current_step: 99,
      seat_status: record.classroom_id ? "reserved" : "none",
      parent_national_id: record.parent_national_id ?? null,
      parent_nationality: record.parent_nationality ?? null,
      parent_relationship: record.parent_relationship ?? "ولي الأمر",
      season_id: seasonId,
      submitted_at: now,
      decided_at: now,
      reviewed_at: now,
      draft_data: parentDraft(record),
    })
    .select("id")
    .single();
  if (error || !app) throw new Error("تعذّر إنشاء سجل الطالب.");

  const { error: childError } = await supabase
    .from("application_children")
    .insert({ application_id: app.id, ...childPatch(record) });
  if (childError) {
    await supabase.from("applications").delete().eq("id", app.id);
    throw new Error("تعذّر حفظ بيانات الطالب.");
  }

  const number = await issueAcademicNumber(supabase, app.id, academicYear);
  await supabase
    .from("applications")
    .update({ application_number: number, student_number: number })
    .eq("id", app.id);

  const { data: child } = await supabase
    .from("application_children")
    .select("id")
    .eq("application_id", app.id)
    .maybeSingle();

  return { applicationId: app.id, childId: child?.id ?? null, number };
}

export type ImportOutcome = {
  name: string;
  ok: boolean;
  number?: string;
  message?: string;
};

/* ------------------------------------------------------------------ */
/* Duplicate protection                                                */
/* ------------------------------------------------------------------ */

const normalizeName = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();

const digitsOnly = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

type ExistingStudent = {
  id: string;
  name: string;
  nameKey: string;
  nationalId: string;
  birthDate: string | null;
  number: string | null;
  status: string;
  withdrawn: boolean;
};

/** Every student already stored in the system, indexed for duplicate matching. */
async function existingStudents(supabase: Db): Promise<ExistingStudent[]> {
  const { data } = await supabase
    .from("application_children")
    .select(
      "id, name_ar, national_id, birth_date, withdrawn_at, applications!inner (status, student_number, application_number)",
    )
    .limit(5000);

  return ((data ?? []) as unknown as {
    id: string;
    name_ar: string;
    national_id: string | null;
    birth_date: string | null;
    withdrawn_at: string | null;
    applications: {
      status: string;
      student_number: string | null;
      application_number: string | null;
    };
  }[])
    .filter((row) => row.applications.status !== "rejected")
    .map((row) => ({
      id: row.id,
      name: row.name_ar,
      nameKey: normalizeName(row.name_ar),
      nationalId: digitsOnly(row.national_id),
      birthDate: row.birth_date,
      number: row.applications.student_number ?? row.applications.application_number,
      status: row.applications.status,
      withdrawn: Boolean(row.withdrawn_at),
    }));
}

export type DuplicateHit = {
  index: number;
  name: string;
  matchedBy: "national_id" | "name_birth";
  existingName: string;
  existingNumber: string | null;
  withdrawn: boolean;
  reason: string;
};

type Candidate = {
  index: number;
  name_ar: string;
  national_id?: string | null;
  birth_date?: string | null;
};

function matchCandidate(candidate: Candidate, existing: ExistingStudent[]) {
  const nid = digitsOnly(candidate.national_id);
  if (nid.length >= 8) {
    const hit = existing.find((e) => e.nationalId && e.nationalId === nid);
    if (hit) return { hit, matchedBy: "national_id" as const };
  }
  const nameKey = normalizeName(candidate.name_ar);
  if (nameKey && candidate.birth_date) {
    const hit = existing.find((e) => e.nameKey === nameKey && e.birthDate === candidate.birth_date);
    if (hit) return { hit, matchedBy: "name_birth" as const };
  }
  return null;
}

const duplicateMessage = (matchedBy: "national_id" | "name_birth", hit: ExistingStudent) =>
  matchedBy === "national_id"
    ? `مسجّل مسبقًا بنفس رقم الهوية (${hit.name}${hit.number ? ` — ${hit.number}` : ""})${hit.withdrawn ? " — ضمن المنسحبين" : ""}`
    : `مسجّل مسبقًا بنفس الاسم وتاريخ الميلاد (${hit.name}${hit.number ? ` — ${hit.number}` : ""})${hit.withdrawn ? " — ضمن المنسحبين" : ""}`;

/** Pre-import check: which sheet rows already exist in the system. */
export async function findDuplicateStudents(
  supabase: Db,
  userId: string,
  input: { candidates: Candidate[] },
) {
  await guard(supabase, userId, "view");
  const existing = await existingStudents(supabase);
  const hits: DuplicateHit[] = [];
  const seen = new Map<string, Candidate>();

  for (const candidate of input.candidates) {
    // Duplicates inside the uploaded file itself.
    const selfKey =
      digitsOnly(candidate.national_id).length >= 8
        ? `n:${digitsOnly(candidate.national_id)}`
        : `b:${normalizeName(candidate.name_ar)}|${candidate.birth_date ?? ""}`;
    const twin = seen.get(selfKey);
    if (twin) {
      hits.push({
        index: candidate.index,
        name: candidate.name_ar,
        matchedBy: digitsOnly(candidate.national_id).length >= 8 ? "national_id" : "name_birth",
        existingName: twin.name_ar,
        existingNumber: null,
        withdrawn: false,
        reason: `مكرر داخل الملف نفسه (الصف ${twin.index})`,
      });
      continue;
    }
    seen.set(selfKey, candidate);

    const match = matchCandidate(candidate, existing);
    if (match)
      hits.push({
        index: candidate.index,
        name: candidate.name_ar,
        matchedBy: match.matchedBy,
        existingName: match.hit.name,
        existingNumber: match.hit.number,
        withdrawn: match.hit.withdrawn,
        reason: duplicateMessage(match.matchedBy, match.hit),
      });
  }

  return { duplicates: hits };
}

export async function importStudents(
  supabase: Db,
  userId: string,
  input: { academicYear: string; records: StudentRecord[] },
) {
  await guard(supabase, userId, "seats");
  if (!input.records.length) throw new Error("لا توجد صفوف صالحة للاستيراد.");
  if (input.records.length > 400) throw new Error("الحد الأقصى 400 طالب في الملف الواحد.");

  const { data: season } = await supabase
    .from("admission_seasons")
    .select("id")
    .eq("academic_year", input.academicYear)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const existing = await existingStudents(supabase);
  const results: ImportOutcome[] = [];
  let skipped = 0;

  for (const record of input.records) {
    const duplicate = matchCandidate(
      { index: 0, name_ar: record.name_ar, national_id: record.national_id, birth_date: record.birth_date },
      existing,
    );
    if (duplicate) {
      skipped += 1;
      results.push({
        name: record.name_ar,
        ok: false,
        message: duplicateMessage(duplicate.matchedBy, duplicate.hit),
      });
      continue;
    }

    try {
      const created = await createStudent(
        supabase,
        userId,
        record,
        input.academicYear,
        season?.id ?? null,
      );
      results.push({ name: record.name_ar, ok: true, number: created.number });
      // Keep the in-memory index fresh so the same file can't insert twins.
      existing.push({
        id: created.childId ?? created.applicationId,
        name: record.name_ar,
        nameKey: normalizeName(record.name_ar),
        nationalId: digitsOnly(record.national_id),
        birthDate: record.birth_date,
        number: created.number,
        status: "approved",
        withdrawn: false,
      });
    } catch (error) {
      results.push({
        name: record.name_ar,
        ok: false,
        message: error instanceof Error ? error.message : "خطأ غير متوقع",
      });
    }
  }

  const imported = results.filter((r) => r.ok).length;
  return { imported, failed: results.length - imported, skipped, results };
}

/** Adds a single student manually from the data sheet. */
export async function addStudent(
  supabase: Db,
  userId: string,
  input: { academicYear: string; record: StudentRecord },
) {
  await guard(supabase, userId, "seats");

  const existing = await existingStudents(supabase);
  const duplicate = matchCandidate(
    {
      index: 0,
      name_ar: input.record.name_ar,
      national_id: input.record.national_id,
      birth_date: input.record.birth_date,
    },
    existing,
  );
  if (duplicate)
    throw new Error(`لا يمكن الإضافة: ${duplicateMessage(duplicate.matchedBy, duplicate.hit)}`);

  const { data: season } = await supabase
    .from("admission_seasons")
    .select("id")
    .eq("academic_year", input.academicYear)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const created = await createStudent(
    supabase,
    userId,
    input.record,
    input.academicYear,
    season?.id ?? null,
  );
  return { ok: true as const, ...created };
}

export async function updateStudentRecord(
  supabase: Db,
  userId: string,
  input: { childId: string; record: StudentRecord },
) {
  await guard(supabase, userId, "seats");

  const { data: child } = await supabase
    .from("application_children")
    .select("id, application_id")
    .eq("id", input.childId)
    .maybeSingle();
  if (!child) throw new Error("الطالب غير موجود.");

  const { error } = await supabase
    .from("application_children")
    .update(childPatch(input.record))
    .eq("id", input.childId);
  if (error) throw new Error("تعذّر تحديث بيانات الطالب.");

  const { data: app } = await supabase
    .from("applications")
    .select("draft_data")
    .eq("id", child.application_id)
    .maybeSingle();
  const draft = (app?.draft_data ?? {}) as Record<string, unknown>;

  await supabase
    .from("applications")
    .update({
      stage_id: input.record.stage_id,
      classroom_id: input.record.classroom_id ?? null,
      parent_national_id: input.record.parent_national_id ?? null,
      parent_nationality: input.record.parent_nationality ?? null,
      parent_relationship: input.record.parent_relationship ?? null,
      draft_data: { ...draft, ...parentDraft(input.record), imported: draft.imported === true },
    })
    .eq("id", child.application_id);

  return { ok: true as const };
}

/** Removes a student (and the whole application when it was the last child). */
export async function deleteStudentRecord(supabase: Db, userId: string, input: { childId: string }) {
  await guard(supabase, userId, "archive");

  const { data: child } = await supabase
    .from("application_children")
    .select("id, application_id")
    .eq("id", input.childId)
    .maybeSingle();
  if (!child) throw new Error("الطالب غير موجود.");

  const { count } = await supabase
    .from("application_children")
    .select("id", { count: "exact", head: true })
    .eq("application_id", child.application_id);

  if ((count ?? 1) <= 1) {
    const { error } = await supabase.from("applications").delete().eq("id", child.application_id);
    if (error) throw new Error("تعذّر حذف سجل الطالب.");
  } else {
    const { error } = await supabase.from("application_children").delete().eq("id", input.childId);
    if (error) throw new Error("تعذّر حذف سجل الطالب.");
  }
  return { ok: true as const };
}
