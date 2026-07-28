/**
 * Server-only Admission Management System service.
 *
 * Everything runs as the signed-in staff member (RLS enforced). Capability
 * checks below are defence in depth on top of the database policies.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { can, type Capability } from "./roles";

type Db = SupabaseClient<Database>;
type Status = Database["public"]["Enums"]["application_status"];

export const LIVE_STATUSES: Status[] = [
  "submitted",
  "under_review",
  "needs_action",
  "principal_review",
  "waitlisted",
  "approved",
  "rejected",
];

async function rolesOf(supabase: Db, userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

async function guard(supabase: Db, userId: string, capability: Capability) {
  const roles = await rolesOf(supabase, userId);
  if (!can(roles, capability)) throw new Error("ليس لديك صلاحية تنفيذ هذا الإجراء.");
  return roles;
}

async function logEvent(
  supabase: Db,
  applicationId: string,
  actorId: string,
  eventType: string,
  titleAr: string,
  bodyAr?: string | null,
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

async function profileMap(supabase: Db, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (!unique.length) return {} as Record<string, { fullName: string; email: string | null; phone: string | null }>;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .in("id", unique);
  const map: Record<string, { fullName: string; email: string | null; phone: string | null }> = {};
  for (const row of data ?? []) {
    map[row.id] = { fullName: row.full_name, email: row.email, phone: row.phone };
  }
  return map;
}

type QueueChild = {
  id: string;
  name_ar: string;
  national_id: string | null;
  birth_date: string | null;
  gender: string | null;
  nationality: string | null;
  stage_id: string | null;
  classroom_id: string | null;
  preference_1_classroom_id: string | null;
  photo_url: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  special_needs: string | null;
};

export type QueueFilters = {
  status?: string | null;
  stageId?: string | null;
  classroomId?: string | null;
  officerId?: string | null;
  qurra?: string | null;
  payment?: string | null;
  academicYear?: string | null;
  includeArchived?: boolean;
};

const QUEUE_SELECT = `
  id, application_number, tracking_number, status, priority, seat_status, payment_status,
  assigned_officer_id, academic_year, stage_id, classroom_id, parent_id, grand_total,
  submitted_at, created_at, updated_at, student_number, archived_at,
  parent_national_id, parent_nationality, draft_data,
  application_children ( id, name_ar, national_id, birth_date, gender, nationality, stage_id, classroom_id, preference_1_classroom_id, photo_url, medical_conditions, allergies, special_needs ),
  qurra_requests ( status, requested, mother_employer, mother_employment_status ),
  application_documents ( id, status, document_type_slug, child_index )
`;

export async function listQueue(supabase: Db, userId: string, filters: QueueFilters) {
  await guard(supabase, userId, "view");

  let query = supabase
    .from("applications")
    .select(QUEUE_SELECT)
    .in("status", LIVE_STATUSES)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(400);

  if (!filters.includeArchived) query = query.is("archived_at", null);
  if (filters.status) query = query.eq("status", filters.status as Status);
  if (filters.stageId) query = query.eq("stage_id", filters.stageId);
  if (filters.classroomId) query = query.eq("classroom_id", filters.classroomId);
  if (filters.officerId === "unassigned") query = query.is("assigned_officer_id", null);
  else if (filters.officerId) query = query.eq("assigned_officer_id", filters.officerId);
  if (filters.payment) query = query.eq("payment_status", filters.payment);
  if (filters.academicYear) query = query.eq("academic_year", filters.academicYear);

  const { data, error } = await query;
  if (error) throw new Error("تعذّر تحميل قائمة الطلبات.");

  const rows = (data ?? []).filter((row) => {
    if (!filters.qurra) return true;
    const q = (row.qurra_requests as unknown as { status: string }[] | null)?.[0];
    return (q?.status ?? "not_requested") === filters.qurra;
  });

  const people = await profileMap(supabase, [
    ...rows.map((r) => r.parent_id),
    ...rows.map((r) => r.assigned_officer_id),
  ]);

  const { data: pins } = await supabase
    .from("application_pins")
    .select("application_id")
    .eq("user_id", userId);
  const pinned = new Set((pins ?? []).map((p) => p.application_id));

  return rows.map((row) => {
    const qurra = (row.qurra_requests as unknown as { status: string }[] | null)?.[0] ?? null;
    const docs = (row.application_documents as unknown as { status: string }[] | null) ?? [];
    return {
      ...row,
      children: (row.application_children as unknown as QueueChild[]) ?? [],
      qurraStatus: qurra?.status ?? "not_requested",
      documentsTotal: docs.length,
      documentsApproved: docs.filter((d) => d.status === "approved").length,
      documentsRejected: docs.filter((d) => d.status === "rejected").length,
      parentName: people[row.parent_id]?.fullName ?? "—",
      parentPhone: people[row.parent_id]?.phone ?? null,
      parentEmail: people[row.parent_id]?.email ?? null,
      officerName: row.assigned_officer_id ? (people[row.assigned_officer_id]?.fullName ?? "—") : null,
      pinned: pinned.has(row.id),
    };
  });
}

export type QueueRow = Awaited<ReturnType<typeof listQueue>>[number];

export async function listStaff(supabase: Db, userId: string) {
  await guard(supabase, userId, "view");
  const { data } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["registration_officer", "principal", "admin"]);
  const people = await profileMap(supabase, (data ?? []).map((r) => r.user_id));
  const seen = new Set<string>();
  const out: { id: string; name: string; role: string }[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    out.push({ id: row.user_id, name: people[row.user_id]?.fullName ?? "مستخدم", role: row.role });
  }
  return out;
}

export async function getOverview(supabase: Db, userId: string) {
  await guard(supabase, userId, "view");

  const [apps, events, classrooms, stages, waitlist] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, status, priority, seat_status, payment_status, submitted_at, created_at, stage_id, classroom_id, assigned_officer_id, archived_at, qurra_requests(status)",
      )
      .in("status", LIVE_STATUSES)
      .limit(1000),
    supabase
      .from("application_events")
      .select("id, application_id, event_type, title_ar, body_ar, created_at, actor_id")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("classrooms").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("stages").select("id, slug, name_ar, total_seats, taken_seats").order("sort_order"),
    supabase.from("waiting_list_entries").select("id, classroom_id, status").eq("status", "waiting"),
  ]);

  const rows = (apps.data ?? []).filter((a) => !a.archived_at);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = now.getTime() - 7 * 864e5;
  const at = (v: string | null) => (v ? new Date(v).getTime() : 0);

  const qurraOf = (row: { qurra_requests: unknown }) =>
    ((row.qurra_requests as { status: string }[] | null)?.[0]?.status ?? "not_requested");

  const kpis = {
    today: rows.filter((r) => at(r.submitted_at ?? r.created_at) >= startOfToday).length,
    week: rows.filter((r) => at(r.submitted_at ?? r.created_at) >= weekAgo).length,
    pendingReview: rows.filter((r) => r.status === "submitted" || r.status === "under_review").length,
    principalReview: rows.filter((r) => r.status === "principal_review").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    needsAction: rows.filter((r) => r.status === "needs_action").length,
    waitlisted: rows.filter((r) => r.status === "waitlisted").length,
    qurra: rows.filter((r) => !["not_requested", "rejected"].includes(qurraOf(r))).length,
    unassigned: rows.filter((r) => !r.assigned_officer_id).length,
    seatsAvailable: (classrooms.data ?? []).reduce(
      (sum, c) => sum + Math.max(0, c.capacity - c.taken_seats),
      0,
    ),
    waitingList: (waitlist.data ?? []).length,
    admittedToday: rows.filter((r) => r.status === "approved" && at(r.submitted_at) >= startOfToday).length,
  };

  const actors = await profileMap(supabase, (events.data ?? []).map((e) => e.actor_id));

  return {
    kpis,
    activity: (events.data ?? []).map((e) => ({
      ...e,
      actorName: e.actor_id ? (actors[e.actor_id]?.fullName ?? "النظام") : "النظام",
    })),
    classrooms: (classrooms.data ?? []).map((c) => ({
      ...c,
      waiting: (waitlist.data ?? []).filter((w) => w.classroom_id === c.id).length,
    })),
    stages: stages.data ?? [],
    statusBreakdown: LIVE_STATUSES.map((status) => ({
      status,
      count: rows.filter((r) => r.status === status).length,
    })),
  };
}

export async function getWorkspace(supabase: Db, userId: string, id: string) {
  const roles = await guard(supabase, userId, "view");

  const { data: application, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !application) throw new Error("لم يتم العثور على الطلب.");

  const [children, documents, services, qurra, events, notes, requests, seatHolds, waitlist, catalog] =
    await Promise.all([
      supabase.from("application_children").select("*").eq("application_id", id).order("created_at"),
      supabase.from("application_documents").select("*").eq("application_id", id).order("created_at"),
      supabase.from("application_services").select("*, services(*)").eq("application_id", id),
      supabase.from("qurra_requests").select("*").eq("application_id", id).maybeSingle(),
      supabase
        .from("application_events")
        .select("*")
        .eq("application_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("application_notes")
        .select("*")
        .eq("application_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("document_requests").select("*").eq("application_id", id).order("created_at", { ascending: false }),
      supabase.from("seat_holds").select("*").eq("application_id", id).is("released_at", null),
      supabase.from("waiting_list_entries").select("*").eq("application_id", id),
      Promise.all([
        supabase.from("stages").select("*").order("sort_order"),
        supabase.from("classrooms").select("*").order("sort_order"),
        supabase.from("document_types").select("*").eq("is_active", true).order("sort_order"),
      ]),
    ]);

  const people = await profileMap(supabase, [
    application.parent_id,
    application.assigned_officer_id,
    application.decided_by,
    ...(events.data ?? []).map((e) => e.actor_id),
    ...(notes.data ?? []).map((n) => n.author_id),
  ]);

  const { data: pin } = await supabase
    .from("application_pins")
    .select("id")
    .eq("application_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    roles,
    application,
    parent: people[application.parent_id] ?? null,
    officerName: application.assigned_officer_id
      ? (people[application.assigned_officer_id]?.fullName ?? null)
      : null,
    children: children.data ?? [],
    documents: documents.data ?? [],
    services: services.data ?? [],
    qurra: qurra.data ?? null,
    events: (events.data ?? []).map((e) => ({
      ...e,
      actorName: e.actor_id ? (people[e.actor_id]?.fullName ?? "النظام") : "النظام",
    })),
    notes: (notes.data ?? []).map((n) => ({
      ...n,
      authorName: people[n.author_id]?.fullName ?? "مستخدم",
    })),
    documentRequests: requests.data ?? [],
    seatHolds: seatHolds.data ?? [],
    waitlist: waitlist.data ?? [],
    stages: catalog[0].data ?? [],
    classrooms: catalog[1].data ?? [],
    documentTypes: catalog[2].data ?? [],
    pinned: Boolean(pin),
  };
}

export type Workspace = Awaited<ReturnType<typeof getWorkspace>>;

/* ------------------------------------------------------------------ actions */

async function touch(supabase: Db, id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("applications").update(patch as never).eq("id", id);
  if (error) throw new Error("تعذّر تحديث الطلب.");
}

export async function assignOfficer(
  supabase: Db,
  userId: string,
  input: { id: string; officerId: string | null; note?: string },
) {
  await guard(supabase, userId, "assign");
  await touch(supabase, input.id, { assigned_officer_id: input.officerId });
  const name = input.officerId
    ? ((await profileMap(supabase, [input.officerId]))[input.officerId]?.fullName ?? "مسؤول")
    : null;
  await logEvent(
    supabase,
    input.id,
    userId,
    "application.assigned",
    name ? `تم إسناد الطلب إلى ${name}` : "تم إلغاء إسناد الطلب",
    input.note,
  );
  return { ok: true as const };
}

export async function setPriority(supabase: Db, userId: string, input: { id: string; priority: string }) {
  await guard(supabase, userId, "review");
  await touch(supabase, input.id, { priority: input.priority });
  await logEvent(supabase, input.id, userId, "application.priority", `تم تغيير الأولوية إلى ${input.priority}`);
  return { ok: true as const };
}

export async function startReview(supabase: Db, userId: string, input: { id: string; note?: string }) {
  await guard(supabase, userId, "review");
  await touch(supabase, input.id, {
    status: "under_review" as Status,
    assigned_officer_id: userId,
  });
  await logEvent(supabase, input.id, userId, "application.review_started", "بدأت مراجعة الطلب", input.note);
  return { ok: true as const };
}

export async function reviewDocument(
  supabase: Db,
  userId: string,
  input: { id: string; documentId: string; status: "approved" | "rejected" | "replace"; note?: string },
) {
  await guard(supabase, userId, "documents");
  const { error } = await supabase
    .from("application_documents")
    .update({
      status: input.status,
      note: input.note ?? null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.documentId)
    .eq("application_id", input.id);
  if (error) throw new Error("تعذّر تحديث حالة المستند.");

  const label =
    input.status === "approved" ? "تم اعتماد مستند" : input.status === "rejected" ? "تم رفض مستند" : "طُلب استبدال مستند";
  await logEvent(supabase, input.id, userId, `document.${input.status}`, label, input.note);
  return { ok: true as const };
}

export async function requestDocuments(
  supabase: Db,
  userId: string,
  input: { id: string; items: { slug: string; childIndex: number | null }[]; note?: string },
) {
  await guard(supabase, userId, "documents");
  if (!input.items.length) throw new Error("اختر مستندًا واحدًا على الأقل.");

  const { error } = await supabase.from("document_requests").insert(
    input.items.map((item) => ({
      application_id: input.id,
      document_type_slug: item.slug,
      child_index: item.childIndex,
      note: input.note ?? null,
      requested_by: userId,
    })),
  );
  if (error) throw new Error("تعذّر إرسال طلب المستندات.");

  await touch(supabase, input.id, { status: "needs_action" as Status });
  await logEvent(
    supabase,
    input.id,
    userId,
    "documents.requested",
    `تم طلب ${input.items.length} مستند من ولي الأمر`,
    input.note,
    { items: input.items },
  );
  await supabase.from("application_notes").insert({
    application_id: input.id,
    author_id: userId,
    visibility: "parent",
    body:
      (input.note ? `${input.note}\n\n` : "") +
      `المستندات المطلوبة: ${input.items.map((i) => i.slug).join("، ")}`,
  });
  return { ok: true as const };
}

export async function returnToParent(supabase: Db, userId: string, input: { id: string; note: string }) {
  await guard(supabase, userId, "review");
  await touch(supabase, input.id, { status: "needs_action" as Status, review_note: input.note });
  await logEvent(supabase, input.id, userId, "application.returned", "تمت إعادة الطلب لولي الأمر لاستكمال البيانات", input.note);
  await supabase.from("application_notes").insert({
    application_id: input.id,
    author_id: userId,
    visibility: "parent",
    body: input.note,
  });
  return { ok: true as const };
}

/** Short-lived signed URL so staff can preview/download an uploaded document. */
export async function documentSignedUrl(
  supabase: Db,
  userId: string,
  input: { id: string; documentId: string },
) {
  await guard(supabase, userId, "documents");
  const { data: doc, error } = await supabase
    .from("application_documents")
    .select("file_path, file_name")
    .eq("id", input.documentId)
    .eq("application_id", input.id)
    .maybeSingle();
  if (error || !doc) throw new Error("تعذّر العثور على المستند.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from("admission-documents")
    .createSignedUrl(doc.file_path, 300);
  if (signError || !signed?.signedUrl) throw new Error("تعذّر إنشاء رابط المعاينة.");
  return { url: signed.signedUrl, fileName: doc.file_name ?? "document" };
}

async function _returnToParentLegacy(supabase: Db, userId: string, input: { id: string; note: string }) {
  await touch(supabase, input.id, { status: "needs_action" as Status, review_note: input.note });
  await logEvent(supabase, input.id, userId, "application.returned", "تمت إعادة الطلب لولي الأمر لاستكمال البيانات", input.note);
  await supabase.from("application_notes").insert({
    application_id: input.id,
    author_id: userId,
    visibility: "parent",
    body: input.note,
  });
  return { ok: true as const };
}

export async function recommendToPrincipal(
  supabase: Db,
  userId: string,
  input: { id: string; recommendation: string },
) {
  await guard(supabase, userId, "recommend");
  await touch(supabase, input.id, {
    status: "principal_review" as Status,
    officer_recommendation: input.recommendation,
    reviewed_at: new Date().toISOString(),
  });
  await logEvent(
    supabase,
    input.id,
    userId,
    "application.recommended",
    "تم رفع الطلب لاعتماد مدير المدرسة",
    input.recommendation,
  );
  return { ok: true as const };
}

function studentNumber(year: string) {
  const chars = "0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[bytes[i] % chars.length];
  return `${year}${out}`;
}

export async function decideApplication(
  supabase: Db,
  userId: string,
  input: { id: string; decision: "approved" | "rejected"; note: string; signature?: string },
) {
  await guard(supabase, userId, "decide");
  const { data: app } = await supabase
    .from("applications")
    .select("academic_year, student_number, classroom_id")
    .eq("id", input.id)
    .maybeSingle();

  const approved = input.decision === "approved";
  await touch(supabase, input.id, {
    status: input.decision as Status,
    decided_by: userId,
    decided_at: new Date().toISOString(),
    decision_note: input.note,
    seat_status: approved ? "reserved" : "released",
    student_number: approved ? (app?.student_number ?? studentNumber(app?.academic_year ?? "1447")) : null,
  });

  if (!approved) {
    await supabase
      .from("seat_holds")
      .update({ released_at: new Date().toISOString() })
      .eq("application_id", input.id)
      .is("released_at", null);
  }

  await logEvent(
    supabase,
    input.id,
    userId,
    approved ? "application.approved" : "application.rejected",
    approved ? "اعتمد مدير المدرسة قبول الطلب" : "تم رفض الطلب من مدير المدرسة",
    input.note,
    { signature: input.signature ?? null },
  );
  return { ok: true as const };
}

export async function manageSeat(
  supabase: Db,
  userId: string,
  input: { id: string; action: "reserve" | "release" | "transfer"; classroomId?: string | null; note?: string },
) {
  await guard(supabase, userId, "seats");

  if (input.action === "release") {
    await supabase
      .from("seat_holds")
      .update({ released_at: new Date().toISOString() })
      .eq("application_id", input.id)
      .is("released_at", null);
    await touch(supabase, input.id, { seat_status: "released" });
    await logEvent(supabase, input.id, userId, "seat.released", "تم تحرير المقعد", input.note);
    return { ok: true as const };
  }

  if (!input.classroomId) throw new Error("اختر الفصل أولًا.");

  const { data: hold } = await supabase
    .from("seat_holds")
    .select("id")
    .eq("application_id", input.id)
    .is("released_at", null)
    .maybeSingle();

  const expires = new Date(Date.now() + 7 * 864e5).toISOString();
  if (hold) {
    await supabase
      .from("seat_holds")
      .update({ classroom_id: input.classroomId, expires_at: expires })
      .eq("id", hold.id);
  } else {
    await supabase
      .from("seat_holds")
      .insert({ application_id: input.id, classroom_id: input.classroomId, expires_at: expires });
  }

  await touch(supabase, input.id, {
    classroom_id: input.classroomId,
    seat_status: input.action === "reserve" ? "reserved" : "held",
  });
  await logEvent(
    supabase,
    input.id,
    userId,
    input.action === "reserve" ? "seat.reserved" : "seat.transferred",
    input.action === "reserve" ? "تم حجز المقعد" : "تم نقل الطالب إلى فصل آخر",
    input.note,
  );
  return { ok: true as const };
}

export async function moveToWaitingList(
  supabase: Db,
  userId: string,
  input: { id: string; classroomId: string | null; note?: string },
) {
  await guard(supabase, userId, "waitlist");
  const { data: existing } = await supabase
    .from("waiting_list_entries")
    .select("id")
    .eq("classroom_id", input.classroomId ?? "")
    .eq("status", "waiting");

  await supabase.from("waiting_list_entries").insert({
    application_id: input.id,
    classroom_id: input.classroomId,
    position: (existing?.length ?? 0) + 1,
    note: input.note ?? null,
    created_by: userId,
  });
  await touch(supabase, input.id, { status: "waitlisted" as Status, seat_status: "waitlisted" });
  await logEvent(supabase, input.id, userId, "waitlist.added", "تم نقل الطلب إلى قائمة الانتظار", input.note);
  return { ok: true as const };
}

export async function updateQurra(
  supabase: Db,
  userId: string,
  input: { id: string; status: Database["public"]["Enums"]["qurra_status"]; note?: string },
) {
  await guard(supabase, userId, "qurra");
  const { error } = await supabase
    .from("qurra_requests")
    .update({
      status: input.status,
      decision_note: input.note ?? null,
      decided_at: ["approved", "rejected"].includes(input.status) ? new Date().toISOString() : null,
    })
    .eq("application_id", input.id);
  if (error) throw new Error("تعذّر تحديث حالة قرة.");
  await logEvent(supabase, input.id, userId, "qurra.updated", `تم تحديث حالة دعم قرة إلى ${input.status}`, input.note);
  return { ok: true as const };
}

export async function addNote(
  supabase: Db,
  userId: string,
  input: { id: string; body: string; visibility: "internal" | "confidential" | "parent" },
) {
  await guard(supabase, userId, input.visibility === "confidential" ? "confidential" : "notes");
  const { error } = await supabase.from("application_notes").insert({
    application_id: input.id,
    author_id: userId,
    body: input.body,
    visibility: input.visibility,
  });
  if (error) throw new Error("تعذّر حفظ الملاحظة.");
  return { ok: true as const };
}

export async function setPaymentStatus(
  supabase: Db,
  userId: string,
  input: { id: string; status: string; note?: string },
) {
  await guard(supabase, userId, "payments");
  await touch(supabase, input.id, { payment_status: input.status });
  await logEvent(supabase, input.id, userId, "payment.updated", `تم تحديث حالة السداد إلى ${input.status}`, input.note);
  return { ok: true as const };
}

export async function archiveApplication(supabase: Db, userId: string, input: { id: string; note?: string }) {
  await guard(supabase, userId, "archive");
  await touch(supabase, input.id, { archived_at: new Date().toISOString() });
  await logEvent(supabase, input.id, userId, "application.archived", "تمت أرشفة الطلب", input.note);
  return { ok: true as const };
}

export async function togglePin(supabase: Db, userId: string, input: { id: string; pinned: boolean }) {
  await guard(supabase, userId, "view");
  if (input.pinned) {
    await supabase.from("application_pins").insert({ application_id: input.id, user_id: userId });
  } else {
    await supabase
      .from("application_pins")
      .delete()
      .eq("application_id", input.id)
      .eq("user_id", userId);
  }
  return { ok: true as const };
}

export async function listWaitingList(supabase: Db, userId: string) {
  await guard(supabase, userId, "view");
  const { data } = await supabase
    .from("waiting_list_entries")
    .select("*, applications(application_number, parent_id, status), classrooms(name_ar, capacity, taken_seats)")
    .order("position");
  return data ?? [];
}