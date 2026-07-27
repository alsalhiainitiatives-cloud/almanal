/**
 * Server-only admission application service. Every call runs as the signed-in
 * user (RLS enforced); staff-only transitions are guarded in the database.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { ChildInput, ParentInfoInput, QurraInput } from "./schemas";

type Db = SupabaseClient<Database>;

export const ACADEMIC_YEAR = "1447";

async function loadApplicationRow(supabase: Db, id: string, userId: string) {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new Error("لم يتم العثور على الطلب.");
  if (data.parent_id !== userId) throw new Error("غير مصرح بالوصول لهذا الطلب.");
  return data;
}

async function logEvent(
  supabase: Db,
  applicationId: string,
  actorId: string,
  eventType: string,
  titleAr: string,
  bodyAr?: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("application_events").insert({
    application_id: applicationId,
    actor_id: actorId,
    event_type: eventType,
    title_ar: titleAr,
    body_ar: bodyAr ?? null,
    metadata: metadata as never,
  });
}

/** Step 1 → creates (or reuses) a draft for the chosen stage + classroom. */
export async function startApplication(
  supabase: Db,
  userId: string,
  input: { stageId: string | null; classroomId: string | null },
) {
  const query = supabase
    .from("applications")
    .select("id")
    .eq("parent_id", userId)
    .eq("status", "draft");

  const { data: existing } = input.stageId
    ? await query.eq("stage_id", input.stageId).maybeSingle()
    : await query.is("stage_id", null).maybeSingle();

  if (existing) {
    if (input.classroomId) {
      await supabase
        .from("applications")
        .update({ classroom_id: input.classroomId })
        .eq("id", existing.id);
      await holdSeat(supabase, existing.id, input.classroomId);
    }
    return { id: existing.id };
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      parent_id: userId,
      stage_id: input.stageId,
      classroom_id: input.classroomId,
      academic_year: ACADEMIC_YEAR,
      status: "draft",
      current_step: 3,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("تعذّر إنشاء الطلب، حاول مرة أخرى.");

  if (input.classroomId) await holdSeat(supabase, data.id, input.classroomId);
  await logEvent(supabase, data.id, userId, "application.created", "تم إنشاء مسودة الطلب");
  return { id: data.id };
}

async function holdSeat(supabase: Db, applicationId: string, classroomId: string) {
  const { data: active } = await supabase
    .from("seat_holds")
    .select("id")
    .eq("application_id", applicationId)
    .is("released_at", null)
    .maybeSingle();

  if (active) {
    await supabase
      .from("seat_holds")
      .update({ classroom_id: classroomId, expires_at: new Date(Date.now() + 7 * 864e5).toISOString() })
      .eq("id", active.id);
    return;
  }
  await supabase.from("seat_holds").insert({ application_id: applicationId, classroom_id: classroomId });
}

export async function getApplicationBundle(supabase: Db, userId: string, id: string) {
  const application = await loadApplicationRow(supabase, id, userId);

  const [children, services, documents, qurra, events, seatHold] = await Promise.all([
    supabase.from("application_children").select("*").eq("application_id", id).order("created_at"),
    supabase.from("application_services").select("*").eq("application_id", id),
    supabase.from("application_documents").select("*").eq("application_id", id).order("created_at"),
    supabase.from("qurra_requests").select("*").eq("application_id", id).maybeSingle(),
    supabase
      .from("application_events")
      .select("*")
      .eq("application_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("seat_holds")
      .select("*")
      .eq("application_id", id)
      .is("released_at", null)
      .maybeSingle(),
  ]);

  return {
    application,
    children: children.data ?? [],
    services: (services.data ?? []).map((s) => s.service_id),
    documents: documents.data ?? [],
    qurra: qurra.data ?? null,
    events: events.data ?? [],
    seatHold: seatHold.data ?? null,
  };
}

export async function listMyApplications(supabase: Db, userId: string) {
  const { data } = await supabase
    .from("applications")
    .select("id, status, current_step, application_number, tracking_number, stage_id, classroom_id, grand_total, submitted_at, created_at, updated_at")
    .eq("parent_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Debounced autosave from the wizard. */
export async function saveDraft(
  supabase: Db,
  userId: string,
  input: { id: string; step: number; draft: Record<string, unknown> },
) {
  const current = await loadApplicationRow(supabase, input.id, userId);
  if (!["draft", "needs_action"].includes(current.status)) {
    throw new Error("لا يمكن تعديل الطلب بعد إرساله.");
  }

  const merged = { ...(current.draft_data as Record<string, unknown>), ...input.draft };
  const parent = merged.parent as ParentInfoInput | undefined;

  const { error } = await supabase
    .from("applications")
    .update({
      draft_data: merged as never,
      current_step: Math.max(current.current_step, input.step),
      parent_national_id: parent?.nationalId ?? current.parent_national_id,
      parent_nationality: parent?.nationality ?? current.parent_nationality,
    })
    .eq("id", input.id);

  if (error) throw new Error("تعذّر حفظ المسودة.");
  return { ok: true as const, savedAt: new Date().toISOString() };
}

export type DuplicateCheck = {
  duplicate: boolean;
  applicationNumber: string | null;
  status: string | null;
  isMine: boolean;
};

/**
 * A child may only hold one live application per academic year. The current
 * draft is excluded so re-editing an in-progress application never self-flags.
 */
export async function checkDuplicateChild(
  supabase: Db,
  userId: string,
  input: { nationalId: string; excludeApplicationId?: string | null },
): Promise<DuplicateCheck> {
  const { data } = await supabase
    .from("application_children")
    .select(
      "id, application_id, applications!inner(status, parent_id, academic_year, application_number)",
    )
    .eq("national_id", input.nationalId);

  const hit = (data ?? []).find((row) => {
    if (input.excludeApplicationId && row.application_id === input.excludeApplicationId) return false;
    const app = row.applications as unknown as {
      status: string;
      academic_year: string;
      parent_id: string;
    };
    return app.academic_year === ACADEMIC_YEAR && !["withdrawn", "rejected"].includes(app.status);
  });

  if (!hit) return { duplicate: false, applicationNumber: null, status: null, isMine: false };

  const app = hit.applications as unknown as {
    status: string;
    parent_id: string;
    application_number: string | null;
  };
  return {
    duplicate: true,
    applicationNumber: app.application_number,
    status: app.status,
    isMine: app.parent_id === userId,
  };
}

export async function saveChildren(
  supabase: Db,
  userId: string,
  input: { id: string; children: ChildInput[] },
) {
  const app = await loadApplicationRow(supabase, input.id, userId);
  await supabase.from("application_children").delete().eq("application_id", input.id);

  const rows = input.children.map((c) => ({
    application_id: input.id,
    name_ar: c.nameAr,
    name_en: c.nameEn || null,
    national_id: c.nationalId,
    gender: c.gender,
    birth_date: c.birthDate,
    nationality: c.nationality || (c.nationalId.startsWith("1") ? "سعودي" : c.country || "مقيم"),
    birth_place: c.birthPlace || null,
    photo_url: c.photoUrl || null,
    blood_type: c.bloodType || null,
    medical_conditions: c.medicalConditions || null,
    allergies: c.allergies || null,
    special_needs: c.specialNeeds || null,
    previous_school: c.previousSchool || null,
    last_grade: c.lastGrade || null,
    vaccination_status: c.vaccinationStatus || null,
    stage_id: c.stageId || app.stage_id,
    classroom_id: c.classroomId || app.classroom_id,
    preference_1_classroom_id: c.classroomId || app.classroom_id,
    preference_2_classroom_id: c.preference2 || null,
    preference_3_classroom_id: c.preference3 || null,
  }));

  const { error } = await supabase.from("application_children").insert(rows);
  if (error) throw new Error("تعذّر حفظ بيانات الأبناء.");
  return { ok: true as const };
}

export async function saveQurra(supabase: Db, userId: string, input: { id: string; qurra: QurraInput }) {
  await loadApplicationRow(supabase, input.id, userId);
  const q = input.qurra;

  const payload = {
    application_id: input.id,
    requested: q.requested,
    status: (q.requested ? "waiting_school_review" : "not_requested") as
      | "waiting_school_review"
      | "not_requested",
    declaration_accepted: q.declarationAccepted,
    mother_national_id: q.motherNationalId || null,
    mother_employment_status: q.motherEmploymentStatus || null,
    mother_employer: q.motherEmployer || null,
    mother_job_title: q.motherJobTitle || null,
    notes: q.notes || null,
  };

  const { error } = await supabase.from("qurra_requests").upsert(payload, { onConflict: "application_id" });
  if (error) throw new Error("تعذّر حفظ بيانات دعم قرة.");

  if (q.requested) {
    await logEvent(
      supabase,
      input.id,
      userId,
      "qurra.requested",
      "تم تقديم طلب دعم قرة",
      "بانتظار مراجعة المدرسة قبل الرفع لمنصة قرة.",
    );
  }
  return { ok: true as const };
}

export async function saveServices(
  supabase: Db,
  userId: string,
  input: { id: string; serviceIds: string[] },
) {
  await loadApplicationRow(supabase, input.id, userId);
  await supabase.from("application_services").delete().eq("application_id", input.id);

  if (input.serviceIds.length) {
    const { data: prices } = await supabase
      .from("services")
      .select("id, price")
      .in("id", input.serviceIds);

    const rows = (prices ?? []).map((s) => ({
      application_id: input.id,
      service_id: s.id,
      price_at_selection: s.price,
    }));
    const { error } = await supabase.from("application_services").insert(rows);
    if (error) throw new Error("تعذّر حفظ الخدمات المختارة.");
  }
  return { ok: true as const };
}

export async function recordDocument(
  supabase: Db,
  userId: string,
  input: {
    id: string;
    slug: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    childIndex?: number | null;
  },
) {
  await loadApplicationRow(supabase, input.id, userId);
  const childIndex = input.childIndex ?? null;

  // Replace any previous upload for the same slot (parent slot = null index).
  let del = supabase
    .from("application_documents")
    .delete()
    .eq("application_id", input.id)
    .eq("document_type_slug", input.slug);
  del = childIndex === null ? del.is("child_index", null) : del.eq("child_index", childIndex);
  await del;

  const { error } = await supabase.from("application_documents").insert({
    application_id: input.id,
    document_type_slug: input.slug,
    file_path: input.filePath,
    file_name: input.fileName,
    file_size: input.fileSize,
    child_index: childIndex,
  });
  if (error) throw new Error("تعذّر تسجيل المستند.");
  return { ok: true as const };
}

export async function removeDocument(supabase: Db, userId: string, input: { id: string; docId: string }) {
  await loadApplicationRow(supabase, input.id, userId);
  await supabase.from("application_documents").delete().eq("id", input.docId).eq("application_id", input.id);
  return { ok: true as const };
}

function randomCode(length: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export async function submitApplication(supabase: Db, userId: string, id: string) {
  const app = await loadApplicationRow(supabase, id, userId);
  if (app.status !== "draft" && app.status !== "needs_action") {
    throw new Error("تم إرسال هذا الطلب مسبقًا.");
  }

  const [{ data: children }, { data: chosen }, { data: stage }, { data: qurra }] = await Promise.all([
    supabase.from("application_children").select("id, national_id").eq("application_id", id),
    supabase.from("application_services").select("price_at_selection").eq("application_id", id),
    app.stage_id
      ? supabase.from("stages").select("tuition_from, admission_fee").eq("id", app.stage_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("qurra_requests").select("status").eq("application_id", id).maybeSingle(),
  ]);

  if (!children?.length) throw new Error("أضف بيانات طفل واحد على الأقل قبل الإرسال.");

  const childCount = children.length;
  const admissionFee = Number(stage?.admission_fee ?? 0) * childCount;
  const tuition = Number(stage?.tuition_from ?? 0) * childCount;
  const servicesTotal = (chosen ?? []).reduce((sum, s) => sum + Number(s.price_at_selection), 0);
  const discount = childCount > 1 ? tuition * 0.1 : 0;
  const grandTotal = admissionFee + tuition + servicesTotal - discount;

  const applicationNumber = `MN-${ACADEMIC_YEAR}-${randomCode(5)}`;
  const trackingNumber = randomCode(10);

  const { error } = await supabase
    .from("applications")
    .update({
      status: "submitted",
      application_number: applicationNumber,
      tracking_number: trackingNumber,
      admission_fee: admissionFee,
      tuition_total: tuition,
      services_total: servicesTotal,
      discount_total: discount,
      grand_total: grandTotal,
      current_step: 10,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error("تعذّر إرسال الطلب، حاول مرة أخرى.");

  await logEvent(
    supabase,
    id,
    userId,
    "application.submitted",
    "تم إرسال الطلب إلى قائمة مراجعة مسؤول التسجيل",
    `رقم الطلب ${applicationNumber} — رقم التتبع ${trackingNumber}`,
    { qurraStatus: qurra?.status ?? "not_requested" },
  );

  return { applicationNumber, trackingNumber, grandTotal };
}

export async function withdrawApplication(supabase: Db, userId: string, id: string) {
  await loadApplicationRow(supabase, id, userId);

  await supabase
    .from("seat_holds")
    .update({ released_at: new Date().toISOString() })
    .eq("application_id", id)
    .is("released_at", null);

  const { error } = await supabase.from("applications").update({ status: "withdrawn" }).eq("id", id);
  if (error) throw new Error("تعذّر سحب الطلب.");

  await logEvent(supabase, id, userId, "application.withdrawn", "تم سحب الطلب وتحرير المقعد المحجوز");
  return { ok: true as const };
}

export async function continueWithoutQurra(supabase: Db, userId: string, id: string) {
  await loadApplicationRow(supabase, id, userId);
  await supabase
    .from("qurra_requests")
    .update({ requested: false, status: "not_requested" })
    .eq("application_id", id);
  await logEvent(supabase, id, userId, "qurra.skipped", "تم استكمال الطلب بدون دعم قرة");
  return { ok: true as const };
}

export async function createDocumentUploadPath(userId: string, applicationId: string, slug: string, fileName: string) {
  const safe = fileName.replace(/[^\w.\-]/g, "_").slice(-60);
  return `${userId}/${applicationId}/${slug}-${Date.now()}-${safe}`;
}