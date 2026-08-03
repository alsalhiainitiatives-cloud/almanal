/**
 * Server-only Student Affairs service.
 *
 * Turns admission data into a student registry and a printable, official
 * student file (transfer-ready document). Runs as the signed-in staff member.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { can, type Capability } from "./roles";

type Db = SupabaseClient<Database>;

/** Statuses considered "enrolled / accepted" for student affairs. */
export const STUDENT_STATUSES = ["approved"] as const;

async function guard(supabase: Db, userId: string, capability: Capability) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (!can(roles, capability)) throw new Error("ليس لديك صلاحية الوصول إلى شؤون الطلاب.");
  return roles;
}

const STUDENT_SELECT = `
  id, name_ar, name_en, national_id, gender, birth_date, nationality, birth_place,
  photo_url, blood_type, medical_conditions, allergies, special_needs,
  previous_school, last_grade, vaccination_status, stage_id, classroom_id, created_at,
  applications!inner (
    id, application_number, tracking_number, status, academic_year, student_number,
    parent_id, parent_national_id, parent_nationality, parent_relationship,
    submitted_at, decided_at, draft_data
  )
`;

type AppJoin = {
  id: string;
  application_number: string | null;
  tracking_number: string | null;
  status: string;
  academic_year: string;
  student_number: string | null;
  parent_id: string;
  parent_national_id: string | null;
  parent_nationality: string | null;
  parent_relationship: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  draft_data: Record<string, unknown> | null;
};

function parentFromDraft(draft: Record<string, unknown> | null) {
  const parent = (draft?.parent ?? null) as
    | { fullName?: string; mobile?: string; email?: string; city?: string; district?: string; job?: string }
    | null;
  return parent ?? null;
}

export async function listStudents(
  supabase: Db,
  userId: string,
  filters: { stageId?: string | null; classroomId?: string | null; academicYear?: string | null },
) {
  await guard(supabase, userId, "view");

  let query = supabase
    .from("application_children")
    .select(STUDENT_SELECT)
    .in("applications.status", [...STUDENT_STATUSES])
    .order("name_ar")
    .limit(600);

  if (filters.stageId) query = query.eq("stage_id", filters.stageId);
  if (filters.classroomId) query = query.eq("classroom_id", filters.classroomId);
  if (filters.academicYear) query = query.eq("applications.academic_year", filters.academicYear);

  const [{ data, error }, { data: stages }, { data: classrooms }] = await Promise.all([
    query,
    supabase.from("stages").select("id, name_ar, slug").order("sort_order"),
    supabase.from("classrooms").select("id, name_ar, stage_id, capacity, taken_seats").order("sort_order"),
  ]);
  if (error) throw new Error("تعذّر تحميل سجل الطلاب.");

  const rows = data ?? [];
  const parentIds = [
    ...new Set(rows.map((r) => (r.applications as unknown as AppJoin).parent_id).filter(Boolean)),
  ];
  const { data: profiles } = parentIds.length
    ? await supabase.from("profiles").select("id, full_name, phone, email").in("id", parentIds)
    : { data: [] as { id: string; full_name: string; phone: string | null; email: string | null }[] };
  const people = new Map((profiles ?? []).map((p) => [p.id, p]));

  const students = rows.map((row) => {
    const app = row.applications as unknown as AppJoin;
    const draftParent = parentFromDraft(app.draft_data);
    const profile = people.get(app.parent_id);
    return {
      id: row.id,
      name_ar: row.name_ar,
      name_en: row.name_en,
      national_id: row.national_id,
      gender: row.gender,
      birth_date: row.birth_date,
      nationality: row.nationality,
      photo_url: row.photo_url,
      stage_id: row.stage_id,
      classroom_id: row.classroom_id,
      applicationId: app.id,
      applicationNumber: app.application_number,
      studentNumber: app.student_number,
      academicYear: app.academic_year,
      status: app.status,
      decidedAt: app.decided_at,
      parentName: draftParent?.fullName || profile?.full_name || "—",
      parentPhone: draftParent?.mobile || profile?.phone || null,
    };
  });

  return { students, stages: stages ?? [], classrooms: classrooms ?? [] };
}

export async function getStudentFile(supabase: Db, userId: string, childId: string) {
  await guard(supabase, userId, "view");

  const { data: row, error } = await supabase
    .from("application_children")
    .select(STUDENT_SELECT)
    .eq("id", childId)
    .maybeSingle();
  if (error || !row) throw new Error("لم يتم العثور على ملف الطالب.");

  return buildStudentFile(supabase, row);
}

/**
 * Parent-facing student file: readable only by the guardian who owns the
 * application, and only once the application is approved.
 */
export async function getMyStudentFile(supabase: Db, userId: string, childId: string) {
  const { data: row, error } = await supabase
    .from("application_children")
    .select(STUDENT_SELECT)
    .eq("id", childId)
    .maybeSingle();
  if (error || !row) throw new Error("لم يتم العثور على ملف الطفل.");
  const app = row.applications as unknown as AppJoin;
  if (app.parent_id !== userId) throw new Error("لا تملك صلاحية عرض هذا الملف.");
  if (!STUDENT_STATUSES.includes(app.status as (typeof STUDENT_STATUSES)[number]))
    throw new Error("يصدر ملف الطفل الرسمي بعد اعتماد الطلب.");
  return buildStudentFile(supabase, row);
}

/** Approved children belonging to the signed-in guardian. */
export async function listMyChildren(supabase: Db, userId: string) {
  const { data, error } = await supabase
    .from("application_children")
    .select(STUDENT_SELECT)
    .in("applications.status", [...STUDENT_STATUSES])
    .eq("applications.parent_id", userId)
    .order("name_ar")
    .limit(50);
  if (error) throw new Error("تعذّر تحميل ملفات الأبناء.");
  return (data ?? []).map((row) => {
    const app = row.applications as unknown as AppJoin;
    return {
      id: row.id,
      name_ar: row.name_ar,
      photo_url: row.photo_url,
      stage_id: row.stage_id,
      applicationNumber: app.application_number,
      academicYear: app.academic_year,
    };
  });
}

async function buildStudentFile(supabase: Db, row: Record<string, unknown>) {
  const rowData = row as {
    id: string;
    stage_id: string | null;
    classroom_id: string | null;
    applications: unknown;
  } & Record<string, unknown>;
  return buildStudentFileFrom(supabase, rowData);
}

async function buildStudentFileFrom(
  supabase: Db,
  row: { id: string; stage_id: string | null; classroom_id: string | null; applications: unknown } & Record<
    string,
    unknown
  >,
) {
  const app = row.applications as unknown as AppJoin;

  const [stage, classroom, parent, qurra, services, invoice] = await Promise.all([
    row.stage_id
      ? supabase.from("stages").select("id, name_ar, age_label, operating_hours").eq("id", row.stage_id).maybeSingle()
      : Promise.resolve({ data: null }),
    row.classroom_id
      ? supabase
          .from("classrooms")
          .select("id, name_ar, teacher_name, teacher_title, schedule_ar")
          .eq("id", row.classroom_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("id, full_name, phone, email").eq("id", app.parent_id).maybeSingle(),
    supabase.from("qurra_requests").select("status, requested").eq("application_id", app.id).maybeSingle(),
    supabase
      .from("application_services")
      .select("price_at_selection, services ( name_ar, category )")
      .eq("application_id", app.id),
    supabase
      .from("invoices")
      .select("status, grand_total, paid_total, plan_type, installments_count")
      .eq("application_id", app.id)
      .maybeSingle(),
  ]);

  const draftParent = parentFromDraft(app.draft_data);

  return {
    student: {
      id: row.id,
      name_ar: row.name_ar,
      name_en: row.name_en,
      national_id: row.national_id,
      gender: row.gender,
      birth_date: row.birth_date,
      nationality: row.nationality,
      birth_place: row.birth_place,
      photo_url: row.photo_url,
      blood_type: row.blood_type,
      medical_conditions: row.medical_conditions,
      allergies: row.allergies,
      special_needs: row.special_needs,
      previous_school: row.previous_school,
      last_grade: row.last_grade,
      vaccination_status: row.vaccination_status,
      created_at: row.created_at,
    },
    application: {
      id: app.id,
      applicationNumber: app.application_number,
      studentNumber: app.student_number,
      status: app.status,
      academicYear: app.academic_year,
      relationship: app.parent_relationship,
      submittedAt: app.submitted_at,
      decidedAt: app.decided_at,
    },
    parent: {
      name: draftParent?.fullName || parent.data?.full_name || "—",
      phone: draftParent?.mobile || parent.data?.phone || null,
      email: draftParent?.email || parent.data?.email || null,
      nationalId: app.parent_national_id,
      nationality: app.parent_nationality,
      city: draftParent?.city ?? null,
      district: draftParent?.district ?? null,
      job: draftParent?.job ?? null,
    },
    stage: stage.data ?? null,
    classroom: classroom.data ?? null,
    qurra: qurra.data ?? null,
    services: (services.data ?? []).map((s) => ({
      name: (s.services as unknown as { name_ar: string } | null)?.name_ar ?? "خدمة",
      price: Number(s.price_at_selection),
    })),
    invoice: invoice.data ?? null,
  };
}

/** Staff-managed student photo (stored in the classroom-media bucket). */
export async function setStudentPhoto(
  supabase: Db,
  userId: string,
  input: { childId: string; photoUrl: string | null },
) {
  await guard(supabase, userId, "seats");
  const { error } = await supabase
    .from("application_children")
    .update({ photo_url: input.photoUrl })
    .eq("id", input.childId);
  if (error) throw new Error("تعذّر تحديث صورة الطالب.");
  return { ok: true as const };
}