/**
 * Server-only Admission Management System service.
 *
 * Everything runs as the signed-in staff member (RLS enforced). Capability
 * checks below are defence in depth on top of the database policies.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { DECIDERS, notify } from "@/features/notifications/notifications.server";
import { QURRA_STATUS_LABELS } from "@/features/admissions/eligibility";
import { isValidAcademicNumber } from "./academic-number";
import { issueAcademicNumber } from "./academic-number.server";
import { can, type Capability, PAYMENT_STATUS_LABELS } from "./roles";

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

/** Parent + officer + reference number used to address internal notifications. */
async function appMeta(supabase: Db, id: string) {
  const { data } = await supabase
    .from("applications")
    .select("parent_id, assigned_officer_id, application_number")
    .eq("id", id)
    .maybeSingle();
  return {
    parentId: data?.parent_id ?? null,
    officerId: data?.assigned_officer_id ?? null,
    number: data?.application_number ?? "طلب",
    link: `/ams/applications/${id}`,
  };
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};

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
  seasonId?: string | null;
  includeArchived?: boolean;
};

const QUEUE_SELECT = `
  id, application_number, tracking_number, status, priority, seat_status, payment_status,
  assigned_officer_id, academic_year, season_id, stage_id, classroom_id, parent_id, grand_total,
  submitted_at, created_at, updated_at, student_number, archived_at,
  parent_national_id, parent_nationality, draft_data,
  application_children ( id, name_ar, national_id, birth_date, gender, nationality, stage_id, classroom_id, preference_1_classroom_id, photo_url, medical_conditions, allergies, special_needs ),
  qurra_requests ( status, requested, mother_national_id, mother_employer, mother_employment_status ),
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
  if (filters.seasonId) query = query.eq("season_id", filters.seasonId);

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
    const draft = row.draft_data as { parent?: { fullName?: string; mobile?: string; email?: string } } | null;
    const enteredParent = draft?.parent;
    return {
      ...row,
      children: (row.application_children as unknown as QueueChild[]) ?? [],
      qurraStatus: qurra?.status ?? "not_requested",
      documentsTotal: docs.length,
      documentsApproved: docs.filter((d) => d.status === "approved").length,
      documentsRejected: docs.filter((d) => d.status === "rejected").length,
      parentName: enteredParent?.fullName?.trim() || people[row.parent_id]?.fullName || "—",
      parentPhone: enteredParent?.mobile?.trim() || people[row.parent_id]?.phone || null,
      parentEmail: enteredParent?.email?.trim() || people[row.parent_id]?.email || null,
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

  const [apps, allApps, events, classrooms, stages, waitlist] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, status, priority, seat_status, payment_status, submitted_at, created_at, stage_id, classroom_id, assigned_officer_id, archived_at, qurra_requests(status)",
      )
      .in("status", LIVE_STATUSES)
      .limit(1000),
    supabase.from("applications").select("id, status, created_at, archived_at").limit(2000),
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
  const everything = (allApps.data ?? []).filter((a) => !a.archived_at);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const at = (v: string | null) => (v ? new Date(v).getTime() : 0);

  const qurraOf = (row: { qurra_requests: unknown }) =>
    ((row.qurra_requests as { status: string }[] | null)?.[0]?.status ?? "not_requested");

  const kpis = {
    total: everything.length,
    active: rows.filter((r) => !["approved", "rejected"].includes(r.status)).length,
    drafts: everything.filter((r) => r.status === "draft").length,
    today: rows.filter((r) => at(r.submitted_at ?? r.created_at) >= startOfToday).length,
    pendingReview: rows.filter((r) => r.status === "submitted" || r.status === "under_review").length,
    principalReview: rows.filter((r) => r.status === "principal_review").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    needsAction: rows.filter((r) => r.status === "needs_action").length,
    waitlisted: rows.filter((r) => r.status === "waitlisted").length,
    qurra: rows.filter((r) => !["not_requested", "rejected"].includes(qurraOf(r))).length,
    unassigned: rows.filter((r) => !r.assigned_officer_id).length,
    seatsCapacity: (classrooms.data ?? []).reduce((sum, c) => sum + c.capacity, 0),
    seatsTaken: (classrooms.data ?? []).reduce((sum, c) => sum + c.taken_seats, 0),
    seatsAvailable: (classrooms.data ?? []).reduce(
      (sum, c) => sum + Math.max(0, c.capacity - c.taken_seats),
      0,
    ),
    waitingList: (waitlist.data ?? []).length,
    admittedToday: rows.filter((r) => r.status === "approved" && at(r.submitted_at) >= startOfToday).length,
  };

  const actors = await profileMap(supabase, (events.data ?? []).map((e) => e.actor_id));

  const classroomRows = (classrooms.data ?? []).map((c) => ({
    ...c,
    waiting: (waitlist.data ?? []).filter((w) => w.classroom_id === c.id).length,
  }));

  return {
    kpis,
    activity: (events.data ?? []).map((e) => ({
      ...e,
      actorName: e.actor_id ? (actors[e.actor_id]?.fullName ?? "النظام") : "النظام",
    })),
    classrooms: classroomRows,
    stages: stages.data ?? [],
    occupancyByStage: (stages.data ?? []).map((stage) => {
      const items = classroomRows.filter((c) => c.stage_id === stage.id);
      return {
        id: stage.id,
        name_ar: stage.name_ar,
        capacity: items.reduce((s, c) => s + c.capacity, 0),
        taken: items.reduce((s, c) => s + c.taken_seats, 0),
        waiting: items.reduce((s, c) => s + c.waiting, 0),
        classrooms: items,
      };
    }),
    statusBreakdown: LIVE_STATUSES.map((status) => ({
      status,
      count: rows.filter((r) => r.status === status).length,
    })),
  };
}

/** Full activity log for the dedicated activity tab. */
export async function listActivity(supabase: Db, userId: string, limit = 200) {
  await guard(supabase, userId, "view");
  const { data } = await supabase
    .from("application_events")
    .select("id, application_id, event_type, title_ar, body_ar, created_at, actor_id")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 20), 500));
  const actors = await profileMap(supabase, (data ?? []).map((e) => e.actor_id));
  return (data ?? []).map((e) => ({
    ...e,
    actorName: e.actor_id ? (actors[e.actor_id]?.fullName ?? "النظام") : "النظام",
  }));
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
  const priorityLabel = PRIORITY_LABELS[input.priority] ?? input.priority;
  await logEvent(supabase, input.id, userId, "application.priority", `تم تغيير الأولوية إلى ${priorityLabel}`);
  const meta = await appMeta(supabase, input.id);
  const label = priorityLabel;
  await notify(supabase, {
    userIds: [meta.officerId],
    roles: ["high", "urgent"].includes(input.priority) ? DECIDERS : [],
    kind: "application.priority",
    title: `تغيير أولوية الطلب ${meta.number} إلى ${label}`,
    body: ["high", "urgent"].includes(input.priority)
      ? "الطلب يحتاج معالجة سريعة حسب الأولوية الجديدة."
      : null,
    applicationId: input.id,
    link: meta.link,
    severity: input.priority === "urgent" ? "urgent" : input.priority === "high" ? "warning" : "info",
  });
  return { ok: true as const };
}

export async function startReview(supabase: Db, userId: string, input: { id: string; note?: string }) {
  await guard(supabase, userId, "review");
  await touch(supabase, input.id, {
    status: "under_review" as Status,
    assigned_officer_id: userId,
  });
  await logEvent(supabase, input.id, userId, "application.review_started", "بدأت مراجعة الطلب", input.note);
  const meta = await appMeta(supabase, input.id);
  await notify(supabase, {
    userIds: [meta.parentId],
    kind: "application.review_started",
    title: `بدأت مراجعة طلبك ${meta.number}`,
    body: "تم إسناد الطلب لموظف التسجيل وسيتم إشعارك بأي مستندات أو تعديلات مطلوبة.",
    applicationId: input.id,
    link: "/my-applications",
  });
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

  // Auto-log the milestone once every uploaded document is approved.
  if (input.status === "approved") {
    const { data: docs } = await supabase
      .from("application_documents")
      .select("status")
      .eq("application_id", input.id);
    if ((docs ?? []).length > 0 && (docs ?? []).every((d) => d.status === "approved")) {
      await logEvent(
        supabase,
        input.id,
        userId,
        "documents.all_approved",
        "تم اعتماد جميع المستندات المرفوعة",
      );
    }
  }
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
  const docMeta = await appMeta(supabase, input.id);
  await notify(supabase, {
    userIds: [docMeta.parentId],
    kind: "documents.requested",
    title: `مستندات مطلوبة في الطلب ${docMeta.number}`,
    body: input.note ?? `عدد المستندات المطلوبة: ${input.items.length}`,
    applicationId: input.id,
    link: "/my-applications",
    severity: "warning",
  });
  return { ok: true as const };
}

/** Correction sections map 1:1 to the parent wizard steps. */
export const CORRECTION_SECTIONS = ["parent", "children", "qurra", "services", "documents"] as const;
export type CorrectionSection = (typeof CORRECTION_SECTIONS)[number];

export const CORRECTION_LABELS: Record<CorrectionSection, string> = {
  parent: "بيانات ولي الأمر",
  children: "بيانات الأبناء",
  qurra: "برنامج قرة",
  services: "الخدمات الإضافية",
  documents: "المستندات",
};

/**
 * Ask the parent to fix specific sections. Only the requested sections are
 * unlocked in the parent wizard; everything else stays read-only.
 */
export async function requestCorrections(
  supabase: Db,
  userId: string,
  input: { id: string; sections: CorrectionSection[]; note: string },
) {
  await guard(supabase, userId, "review");
  if (!input.sections.length) throw new Error("اختر قسمًا واحدًا على الأقل للتصحيح.");

  const labels = input.sections.map((s) => CORRECTION_LABELS[s]).join("، ");
  await touch(supabase, input.id, {
    status: "needs_action" as Status,
    review_note: input.note,
    correction_sections: input.sections,
    correction_note: input.note,
    correction_requested_at: new Date().toISOString(),
  });
  await logEvent(
    supabase,
    input.id,
    userId,
    "application.corrections_requested",
    `طُلب تصحيح: ${labels}`,
    input.note,
    { sections: input.sections },
  );
  await supabase.from("application_notes").insert({
    application_id: input.id,
    author_id: userId,
    visibility: "parent",
    body: `الأقسام المطلوب تصحيحها: ${labels}\n\n${input.note}`,
  });
  const corrMeta = await appMeta(supabase, input.id);
  await notify(supabase, {
    userIds: [corrMeta.parentId],
    kind: "application.corrections_requested",
    title: `مطلوب تعديل في الطلب ${corrMeta.number}`,
    body: `الأقسام: ${labels}`,
    applicationId: input.id,
    link: "/my-applications",
    severity: "warning",
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

  const { data: signed, error: signError } = await supabase.storage
    .from("admission-documents")
    .createSignedUrl(doc.file_path, 300);
  if (signError || !signed?.signedUrl) throw new Error("تعذّر إنشاء رابط المعاينة.");
  return { url: signed.signedUrl, fileName: doc.file_name ?? "document" };
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
  const meta = await appMeta(supabase, input.id);
  await notify(supabase, {
    roles: DECIDERS,
    kind: "application.recommended",
    title: `طلب جديد بانتظار اعتمادك: ${meta.number}`,
    body: input.recommendation,
    applicationId: input.id,
    link: meta.link,
    severity: "warning",
  });
  await notify(supabase, {
    userIds: [meta.parentId],
    kind: "application.recommended",
    title: `طلبك ${meta.number} رُفع لاعتماد مدير المدرسة`,
    body: "اكتملت مراجعة الطلب من موظف التسجيل، وهو الآن بانتظار القرار النهائي.",
    applicationId: input.id,
    link: "/my-applications",
  });
  return { ok: true as const };
}

/** Officer nudges the principal to act on a pending approval. */
export async function nudgePrincipal(supabase: Db, userId: string, input: { id: string; note?: string }) {
  await guard(supabase, userId, "recommend");
  await logEvent(
    supabase,
    input.id,
    userId,
    "application.nudge",
    "تم إرسال تذكير لمدير المدرسة باعتماد الطلب",
    input.note,
  );
  const meta = await appMeta(supabase, input.id);
  await notify(supabase, {
    roles: DECIDERS,
    kind: "application.nudge",
    title: `تذكير باعتماد الطلب ${meta.number}`,
    body: input.note ?? "أرسل موظف التسجيل تذكيرًا لاستعجال القرار.",
    applicationId: input.id,
    link: meta.link,
    severity: "urgent",
  });
  return { ok: true as const };
}

export async function decideApplication(
  supabase: Db,
  userId: string,
  input: { id: string; decision: "approved" | "rejected"; note?: string; signature?: string },
) {
  await guard(supabase, userId, "decide");
  // The decision is signed automatically with the deciding manager's own name,
  // and the note stays optional (a default sentence is stored for the record).
  const { data: deciderProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  const signature = (input.signature ?? deciderProfile?.full_name ?? "").trim() || null;
  const approvedDecision = input.decision === "approved";
  const note =
    (input.note ?? "").trim() ||
    (approvedDecision ? "تم اعتماد قبول الطلب." : "تم رفض الطلب.");
  const { data: app } = await supabase
    .from("applications")
    .select("academic_year, student_number, application_number, classroom_id")
    .eq("id", input.id)
    .maybeSingle();

  const approved = approvedDecision;
  // Keep an already-issued number only when it matches the current scheme;
  // legacy values are replaced with a clean sequential academic number.
  const academicNumber = approved
    ? isValidAcademicNumber(app?.application_number)
      ? (app?.application_number as string)
      : isValidAcademicNumber(app?.student_number)
      ? (app?.student_number as string)
      : await issueAcademicNumber(supabase, input.id, app?.academic_year ?? "")
    : null;
  await touch(supabase, input.id, {
    status: input.decision as Status,
    decided_by: userId,
    decided_at: new Date().toISOString(),
    decision_note: note,
    seat_status: approved ? "reserved" : "released",
    student_number: academicNumber,
    // The academic number is the single identifier used across the platform.
    ...(academicNumber
      ? { application_number: academicNumber, tracking_number: academicNumber }
      : {}),
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
    note,
    { signature },
  );
  const meta = await appMeta(supabase, input.id);
  /* An approved application whose children have no seat yet is an approval
     *onto the waiting list* — the parent must never read it as a placement. */
  let waitlistPosition: number | null = null;
  if (approved) {
    const [{ data: kids }, { data: queued }] = await Promise.all([
      supabase.from("application_children").select("id, classroom_id").eq("application_id", input.id),
      supabase
        .from("waiting_list_entries")
        .select("position")
        .eq("application_id", input.id)
        .eq("status", "waiting")
        .order("position")
        .limit(1),
    ]);
    const unseated = (kids ?? []).length > 0 && (kids ?? []).every((k) => !k.classroom_id);
    if (unseated || (queued ?? []).length > 0) {
      waitlistPosition = queued?.[0]?.position ?? null;
      await touch(supabase, input.id, { seat_status: "waitlisted" });
    }
  }
  const onWaitlist = approved && waitlistPosition !== null;
  await notify(supabase, {
    userIds: [meta.parentId],
    kind: approved
      ? onWaitlist
        ? "application.approved_waitlisted"
        : "application.approved"
      : "application.rejected",
    title: approved
      ? onWaitlist
        ? `تمت الموافقة على الطلب ${meta.number} — على قائمة الانتظار`
        : `تم قبول الطلب ${meta.number}`
      : `تم رفض الطلب ${meta.number}`,
    body: onWaitlist
      ? `تمت الموافقة على الطلب، ولا يتوفّر مقعد شاغر حاليًا؛ لذلك يبقى الطلب على قائمة الانتظار${
          waitlistPosition ? ` بالترتيب ${waitlistPosition}` : ""
        } وسيتم إشعاركم فور توفّر مقعد حسب أسبقية التسجيل.${note ? ` — ${note}` : ""}`
      : note,
    applicationId: input.id,
    link: "/my-applications",
    severity: approved && !onWaitlist ? "success" : "warning",
  });
  await notify(supabase, {
    userIds: [meta.officerId],
    kind: "application.decided",
    title: `صدر قرار المدير على الطلب ${meta.number}: ${approved ? "قبول" : "رفض"}`,
    body: note,
    applicationId: input.id,
    link: meta.link,
    severity: approved ? "success" : "info",
  });
  if (approved) {
    // Approved applications flow automatically into Student Affairs (student
    // file) and the finance module (invoice created on plan selection).
    await logEvent(
      supabase,
      input.id,
      userId,
      "application.handoff",
      "تم تحويل الطالب تلقائيًا إلى شؤون الطلاب والإدارة المالية",
      `الرقم الأكاديمي ${academicNumber ?? meta.number} — أصبح ملف الطالب متاحًا في سجل الطلاب، وتُنشأ الفاتورة عند اختيار ولي الأمر لخطة السداد.`,
    );
    await notify(supabase, {
      roles: ["accountant", "registration_officer", "principal", "supervisor", "admin"],
      kind: "student.enrolled",
      title: `طالب جديد في سجل الطلاب: ${academicNumber ?? meta.number}`,
      body: "تم التحويل تلقائيًا من القبول إلى شؤون الطلاب والمالية.",
      applicationId: input.id,
      link: "/ams/students",
      severity: "success",
    });
  }
  return { ok: true as const };
}

export async function manageSeat(
  supabase: Db,
  userId: string,
  input: { id: string; action: "reserve" | "release" | "transfer"; classroomId?: string | null; note?: string },
) {
  await guard(supabase, userId, "seats");

  const { data: current } = await supabase
    .from("applications")
    .select("classroom_id, seat_status")
    .eq("id", input.id)
    .maybeSingle();
  if (
    input.action === "reserve" &&
    current?.seat_status === "reserved" &&
    current.classroom_id === input.classroomId
  ) {
    return { ok: true as const };
  }

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
  const meta = await appMeta(supabase, input.id);
  const position = (existing?.length ?? 0) + 1;
  const { data: queueRoom } = input.classroomId
    ? await supabase.from("classrooms").select("name_ar").eq("id", input.classroomId).maybeSingle()
    : { data: null };
  await notify(supabase, {
    userIds: [meta.parentId],
    kind: "waitlist.added",
    title: `طلبكم ${meta.number} مُدرج على قائمة الانتظار`,
    body:
      `تمت الموافقة على الطلب مبدئيًا، ولا يتوفّر مقعد شاغر حاليًا${
        queueRoom?.name_ar ? ` في فصل ${queueRoom.name_ar}` : ""
      }. ترتيبكم على قائمة الانتظار ${position}، وسيتم إشعاركم فور توفّر مقعد حسب أسبقية التسجيل.` +
      (input.note ? ` — ملاحظة الإدارة: ${input.note}` : ""),
    applicationId: input.id,
    link: "/my-applications",
    severity: "warning",
  });
  /* Instant staff alert so the waiting list is never a silent queue. */
  await notify(supabase, {
    roles: ["registration_officer", "supervisor", "principal", "admin"],
    kind: "waitlist.added_staff",
    title: `إضافة جديدة لقائمة الانتظار: ${meta.number}`,
    body: `${queueRoom?.name_ar ? `فصل ${queueRoom.name_ar} — ` : ""}الترتيب ${position}.`,
    applicationId: input.id,
    link: "/ams/waiting-list",
    severity: "warning",
  });
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
  await logEvent(
    supabase,
    input.id,
    userId,
    "qurra.updated",
    `تم تحديث حالة دعم قرة إلى ${QURRA_STATUS_LABELS[input.status] ?? input.status}`,
    input.note,
  );
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
  await logEvent(
    supabase,
    input.id,
    userId,
    "payment.updated",
    `تم تحديث حالة السداد إلى ${PAYMENT_STATUS_LABELS[input.status] ?? input.status}`,
    input.note,
  );
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
  const [entries, classrooms] = await Promise.all([
    supabase
      .from("waiting_list_entries")
      .select(
        "*, applications(application_number, parent_id, status, application_children(id, name_ar, birth_date, preference_1_classroom_id, preference_2_classroom_id, preference_3_classroom_id)), classrooms(id, name_ar, capacity, taken_seats, min_age_months, max_age_months, max_waiting, is_active)",
      )
      .order("position"),
    supabase
      .from("classrooms")
      .select("id, name_ar, capacity, taken_seats, min_age_months, max_age_months, max_waiting, is_active")
      .order("sort_order"),
  ]);

  /* Children with no seat yet whose *every* chosen preference is unavailable:
     they belong on the waiting list even when no queue row was created. */
  const { data: pendingChildren } = await supabase
    .from("application_children")
    .select(
      "id, name_ar, birth_date, classroom_id, preference_1_classroom_id, preference_2_classroom_id, preference_3_classroom_id, application_id, applications!inner(id, application_number, status, archived_at, parent_id, academic_year, created_at)",
    )
    .is("classroom_id", null)
    .in("applications.status", SEAT_ACTIVE)
    .limit(1000);

  const parents = await profileMap(
    supabase,
    (pendingChildren ?? []).map((row) => (row as never as { applications: { parent_id: string } }).applications.parent_id),
  );

  const queuedChildIds = new Set((entries.data ?? []).map((e) => e.child_id).filter(Boolean) as string[]);

  const blocked = ((pendingChildren ?? []) as unknown as {
    id: string;
    name_ar: string;
    birth_date: string | null;
    application_id: string;
    preference_1_classroom_id: string | null;
    preference_2_classroom_id: string | null;
    preference_3_classroom_id: string | null;
    applications: {
      application_number: string | null;
      status: Status;
      archived_at: string | null;
      parent_id: string;
      academic_year: string | null;
      created_at: string;
    };
  }[])
    .filter((row) => !row.applications?.archived_at && !queuedChildIds.has(row.id))
    .map((row) => ({
      childId: row.id,
      childName: row.name_ar,
      birthDate: row.birth_date,
      applicationId: row.application_id,
      applicationNumber: row.applications?.application_number ?? null,
      status: row.applications?.status ?? null,
      academicYear: row.applications?.academic_year ?? null,
      createdAt: row.applications?.created_at ?? null,
      preferences: [
        row.preference_1_classroom_id,
        row.preference_2_classroom_id,
        row.preference_3_classroom_id,
      ],
      parentName: parents[row.applications?.parent_id ?? ""]?.fullName ?? null,
      parentPhone: parents[row.applications?.parent_id ?? ""]?.phone ?? null,
    }));

  return { entries: entries.data ?? [], classrooms: classrooms.data ?? [], blocked };
}

/** Tells the parent a seat opened up in one of their preferred classrooms. */
export async function notifySeatAvailable(
  supabase: Db,
  userId: string,
  input: { applicationId: string; classroomId: string; childName?: string | null },
) {
  await guard(supabase, userId, "seats");
  const [{ data: classroom }, meta] = await Promise.all([
    supabase.from("classrooms").select("name_ar").eq("id", input.classroomId).maybeSingle(),
    appMeta(supabase, input.applicationId),
  ]);
  const classroomName = classroom?.name_ar ?? "الفصل";
  const title = `توفّر مقعد في فصل ${classroomName}`;
  const body = `${input.childName ? `${input.childName}: ` : ""}تم توفّر مقعد شاغر في فصل ${classroomName}. يرجى التواصل مع إدارة الروضة لتأكيد التسكين.`;

  if (meta?.parentId) {
    await notify(supabase, {
      userIds: [meta.parentId],
      kind: "waitlist.seat_available",
      title,
      body,
      applicationId: input.applicationId,
      link: "/my-applications",
      severity: "success",
    });
  }
  await logEvent(supabase, input.applicationId, userId, "waitlist.notified", title, body);

  const parents = await profileMap(supabase, [meta?.parentId ?? null]);
  return {
    ok: true as const,
    message: body,
    parentPhone: parents[meta?.parentId ?? ""]?.phone ?? null,
    classroomName,
  };
}

/* ------------------------------------------------------------------ */
/* Seat board                                                          */
/* ------------------------------------------------------------------ */

const SEAT_ACTIVE: Status[] = [
  "submitted",
  "under_review",
  "needs_action",
  "principal_review",
  "waitlisted",
  "approved",
];

type ChildRow = {
  id: string;
  name_ar: string;
  birth_date: string | null;
  national_id: string | null;
  nationality: string | null;
  gender: string | null;
  classroom_id: string | null;
  stage_id: string | null;
  application_id: string;
  applications: {
    id: string;
    application_number: string | null;
    status: Status;
    archived_at: string | null;
    qurra_requests: { status: string; requested: boolean; mother_employment_status: string | null }[] | null;
  } | null;
};

function toSeatChild(row: ChildRow) {
  const qurra = row.applications?.qurra_requests?.[0] ?? null;
  return {
    id: row.id,
    name_ar: row.name_ar,
    birth_date: row.birth_date,
    national_id: row.national_id,
    nationality: row.nationality,
    gender: row.gender,
    classroom_id: row.classroom_id,
    stage_id: row.stage_id,
    application_id: row.application_id,
    application_number: row.applications?.application_number ?? null,
    application_status: row.applications?.status ?? "submitted",
    qurra_requested: Boolean(qurra?.requested),
    qurra_status: qurra?.status ?? null,
    mother_employment_status: qurra?.mother_employment_status ?? null,
  };
}

async function seatChildren(supabase: Db) {
  const { data } = await supabase
    .from("application_children")
    .select(
      "id, name_ar, birth_date, national_id, nationality, gender, classroom_id, stage_id, application_id, applications!inner ( id, application_number, status, archived_at, qurra_requests ( status, requested, mother_employment_status ) )",
    )
    .in("applications.status", SEAT_ACTIVE)
    .limit(2000);
  return ((data ?? []) as unknown as ChildRow[]).filter((row) => !row.applications?.archived_at);
}

/**
 * Recomputes `taken_seats` for every classroom (and stage totals) from real
 * placements *and* approved pre-reservations, so an occupied seat is never
 * offered twice. The database owns the arithmetic (single source of truth) and
 * triggers keep it fresh on every write.
 */
async function recountSeats(supabase: Db, _classroomIds?: (string | null | undefined)[]) {
  await supabase.rpc("recount_classroom_seats");
  await supabase.rpc("recount_stage_seats");
}

/** Seats blocked by approved Step-0 reservations that have no application yet. */
async function reservedSeats(supabase: Db) {
  const { data } = await supabase
    .from("seat_reservation_children")
    .select("id, name_ar, assigned_classroom_id, seat_reservations!inner(status, application_id)")
    .eq("waitlisted", false)
    .not("assigned_classroom_id", "is", null)
    .eq("seat_reservations.status", "approved")
    .is("seat_reservations.application_id", null)
    .limit(2000);
  return (data ?? []) as unknown as { id: string; name_ar: string; assigned_classroom_id: string }[];
}

export async function getSeatBoard(supabase: Db, userId: string) {
  await guard(supabase, userId, "view");

  const [stagesRes, classroomsRes, waitlistRes, childRows, reserved] = await Promise.all([
    supabase.from("stages").select("id, slug, name_ar, age_label").eq("is_active", true).order("sort_order"),
    supabase.from("classrooms").select("*").eq("is_active", true).order("sort_order"),
    supabase
      .from("waiting_list_entries")
      .select(
        "id, classroom_id, application_id, child_id, position, status, created_at, applications(application_number, application_children(id, name_ar, birth_date))",
      )
      .eq("status", "waiting")
      .order("position"),
    seatChildren(supabase),
    reservedSeats(supabase),
  ]);

  const children = childRows.map(toSeatChild);
  const waiting = (waitlistRes.data ?? []) as unknown as {
    id: string;
    classroom_id: string | null;
    application_id: string;
    child_id: string | null;
    position: number;
    created_at: string;
    applications: {
      application_number: string | null;
      application_children: { id: string; name_ar: string; birth_date: string | null }[] | null;
    } | null;
  }[];

  const classrooms = (classroomsRes.data ?? []).map((c) => {
    const placed = children.filter((child) => child.classroom_id === c.id);
    const held = reserved.filter((r) => r.assigned_classroom_id === c.id);
    const queue = waiting
      .filter((w) => w.classroom_id === c.id)
      .map((w) => {
        const kids = w.applications?.application_children ?? [];
        const kid = (w.child_id ? kids.find((k) => k.id === w.child_id) : null) ?? kids[0] ?? null;
        return {
          entryId: w.id,
          position: w.position,
          createdAt: w.created_at,
          applicationId: w.application_id,
          applicationNumber: w.applications?.application_number ?? null,
          childId: kid?.id ?? null,
          childName: kid?.name_ar ?? "بدون اسم",
          birthDate: kid?.birth_date ?? null,
        };
      })
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
    return {
      id: c.id,
      stage_id: c.stage_id,
      slug: c.slug,
      name_ar: c.name_ar,
      color_hex: c.color_hex,
      color_label: c.color_label,
      teacher_name: c.teacher_name,
      teacher_title: c.teacher_title,
      teacher_qualification: c.teacher_qualification,
      teacher_experience: c.teacher_experience,
      teachers: c.teachers,
      cover_image: c.cover_image,
      gallery: c.gallery,
      description_ar: c.description_ar,
      learning_style_ar: c.learning_style_ar,
      schedule_ar: c.schedule_ar,
      daily_schedule: c.daily_schedule,
      sort_order: c.sort_order,
      max_waiting: c.max_waiting,
      capacity: c.capacity,
      min_age_months: c.min_age_months,
      max_age_months: c.max_age_months,
      // `enrolled` is what consumes capacity: real placements + held reservations.
      enrolled: placed.length + held.length,
      placed: placed.length,
      reserved: held.length,
      reservedNames: held.map((r) => r.name_ar),
      waiting: queue.length,
      waitingEntries: queue,
      children: placed,
    };
  });

  return {
    stages: (stagesRes.data ?? []).map((stage) => ({
      ...stage,
      classrooms: classrooms.filter((c) => c.stage_id === stage.id),
    })),
    classrooms,
    unplaced: children.filter((child) => !child.classroom_id),
    totals: {
      capacity: classrooms.reduce((s, c) => s + c.capacity, 0),
      enrolled: classrooms.reduce((s, c) => s + c.enrolled, 0),
      reserved: classrooms.reduce((s, c) => s + c.reserved, 0),
      available: classrooms.reduce((s, c) => s + Math.max(0, c.capacity - c.enrolled), 0),
      unplaced: children.filter((child) => !child.classroom_id).length,
      waiting: waiting.length,
    },
  };
}

/**
 * Moves a child from a classroom waiting list into a real seat.
 * Without `entryId` the first-in-line entry (lowest position, earliest
 * registration) is promoted — the fairness rule staff expect.
 */
export async function seatPromoteFromWaitlist(
  supabase: Db,
  userId: string,
  input: { classroomId: string; entryId?: string | null },
) {
  await guard(supabase, userId, "seats");
  const board = await getSeatBoard(supabase, userId);
  const classroom = board.classrooms.find((c) => c.id === input.classroomId);
  if (!classroom) throw new Error("الفصل غير موجود أو غير مفعّل.");
  if (classroom.enrolled >= classroom.capacity) {
    throw new Error(`فصل «${classroom.name_ar}» مكتمل العدد — حرّر مقعدًا أولًا.`);
  }

  const entry = input.entryId
    ? classroom.waitingEntries.find((e) => e.entryId === input.entryId)
    : classroom.waitingEntries[0];
  if (!entry) throw new Error("لا يوجد طلب في قائمة انتظار هذا الفصل.");
  if (!entry.childId) throw new Error("لا توجد بيانات طفل مرتبطة بهذا الطلب.");

  await seatAssignChild(supabase, userId, { childId: entry.childId, classroomId: classroom.id });

  await supabase
    .from("waiting_list_entries")
    .update({ status: "placed" })
    .eq("id", entry.entryId);

  await supabase
    .from("applications")
    .update({ status: "approved" })
    .eq("id", entry.applicationId)
    .eq("status", "waitlisted");

  await logEvent(
    supabase,
    entry.applicationId,
    userId,
    "waitlist.promoted",
    `تم ترقية ${entry.childName} من قائمة انتظار فصل ${classroom.name_ar} إلى مقعد ثابت`,
    `الترتيب السابق في قائمة الانتظار: ${entry.position}`,
  );

  return { ok: true as const, childName: entry.childName, classroomName: classroom.name_ar };
}

export async function seatAssignChild(
  supabase: Db,
  userId: string,
  input: { childId: string; classroomId: string },
) {
  await guard(supabase, userId, "seats");
  const { validatePlacement } = await import("./seat-rules");

  const board = await getSeatBoard(supabase, userId);
  const classroom = board.classrooms.find((c) => c.id === input.classroomId);
  if (!classroom) throw new Error("الفصل غير موجود أو غير مفعّل.");

  const child =
    board.unplaced.find((c) => c.id === input.childId) ??
    board.classrooms.flatMap((c) => c.children).find((c) => c.id === input.childId);
  if (!child) throw new Error("الطالب غير موجود ضمن الطلبات النشطة.");

  const check = validatePlacement(child, classroom);
  if (!check.ok) throw new Error(check.message ?? "لا يمكن تنفيذ هذا التسكين.");

  const previous = child.classroom_id;
  const { error } = await supabase
    .from("application_children")
    .update({ classroom_id: classroom.id, stage_id: classroom.stage_id })
    .eq("id", child.id);
  if (error) throw new Error("تعذّر تسكين الطالب في الفصل.");

  const siblings = board.classrooms
    .flatMap((c) => c.children)
    .concat(board.unplaced)
    .filter((c) => c.application_id === child.application_id);
  if (siblings.length <= 1) {
    await touch(supabase, child.application_id, {
      classroom_id: classroom.id,
      stage_id: classroom.stage_id,
      seat_status: "reserved",
    });
  }

  await recountSeats(supabase, [previous, classroom.id]);
  await logEvent(
    supabase,
    child.application_id,
    userId,
    previous ? "seat.transferred" : "seat.assigned",
    previous ? `تم نقل ${child.name_ar} إلى فصل ${classroom.name_ar}` : `تم تسكين ${child.name_ar} في فصل ${classroom.name_ar}`,
    check.warnings.join(" · ") || null,
  );

  return { ok: true as const, warnings: check.warnings };
}

export async function seatRemoveChild(supabase: Db, userId: string, input: { childId: string; note?: string }) {
  await guard(supabase, userId, "seats");

  const { data: child } = await supabase
    .from("application_children")
    .select("id, name_ar, classroom_id, application_id")
    .eq("id", input.childId)
    .maybeSingle();
  if (!child) throw new Error("الطالب غير موجود.");
  if (!child.classroom_id) throw new Error("الطالب غير مسكَّن في أي فصل.");

  const previous = child.classroom_id;
  const { error } = await supabase
    .from("application_children")
    .update({ classroom_id: null })
    .eq("id", child.id);
  if (error) throw new Error("تعذّر إزالة الطالب من الفصل.");

  await touch(supabase, child.application_id, { seat_status: "released" });
  await recountSeats(supabase, [previous]);
  await logEvent(
    supabase,
    child.application_id,
    userId,
    "seat.released",
    `تمت إزالة ${child.name_ar} من الفصل`,
    input.note ?? null,
  );
  return { ok: true as const };
}

export async function seatUpdateChild(
  supabase: Db,
  userId: string,
  input: {
    childId: string;
    name_ar?: string;
    birth_date?: string | null;
    national_id?: string | null;
    nationality?: string | null;
    gender?: string | null;
  },
) {
  await guard(supabase, userId, "seats");
  const { childId, ...patch } = input;

  const { data: child } = await supabase
    .from("application_children")
    .select("id, application_id, classroom_id")
    .eq("id", childId)
    .maybeSingle();
  if (!child) throw new Error("الطالب غير موجود.");

  const { error } = await supabase.from("application_children").update(patch).eq("id", childId);
  if (error) throw new Error("تعذّر تحديث بيانات الطالب.");

  // A data change can break the classroom's age window — re-check and report.
  const warnings: string[] = [];
  if (child.classroom_id) {
    const { validatePlacement, identityIssues, qurraIssues } = await import("./seat-rules");
    const board = await getSeatBoard(supabase, userId);
    const classroom = board.classrooms.find((c) => c.id === child.classroom_id);
    const updated = board.classrooms.flatMap((c) => c.children).find((c) => c.id === childId);
    if (classroom && updated) {
      warnings.push(...identityIssues(updated), ...qurraIssues(updated));
      const check = validatePlacement({ ...updated, classroom_id: null }, { ...classroom, enrolled: classroom.enrolled - 1 });
      if (!check.ok && check.message) warnings.push(check.message);
    }
  }

  await logEvent(supabase, child.application_id, userId, "child.updated", "تم تحديث بيانات الطالب", warnings.join(" · ") || null);
  return { ok: true as const, warnings };
}
/* ------------------------------------------------------------------ */
/* Classroom settings (create / update / delete)                       */
/* ------------------------------------------------------------------ */

export type ClassroomInput = {
  id?: string | null;
  stage_id: string;
  slug?: string | null;
  name_ar: string;
  color_hex: string;
  color_label?: string | null;
  teacher_name?: string | null;
  teacher_title?: string | null;
  teacher_qualification?: string | null;
  teacher_experience?: string | null;
  teachers?: {
    name: string;
    title?: string;
    qualification?: string;
    experience?: string;
    photo_url?: string | null;
    cv_url?: string | null;
    cv_name?: string | null;
  }[];
  cover_image?: string | null;
  gallery?: { path: string; caption?: string | null }[];
  capacity: number;
  max_waiting: number;
  min_age_months: number;
  max_age_months: number;
  description_ar?: string | null;
  learning_style_ar?: string | null;
  schedule_ar?: string | null;
  daily_schedule?: { time: string; activity: string }[];
  sort_order?: number | null;
  is_active?: boolean;
};

function slugify(value: string, fallback: string) {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return base || fallback;
}

export async function saveClassroom(supabase: Db, userId: string, input: ClassroomInput) {
  await guard(supabase, userId, "seats");

  if (input.min_age_months >= input.max_age_months) {
    throw new Error("الحد الأدنى للعمر يجب أن يكون أقل من الحد الأعلى.");
  }

  const payload = {
    stage_id: input.stage_id,
    name_ar: input.name_ar.trim(),
    color_hex: input.color_hex,
    color_label: input.color_label?.trim() || null,
    teacher_name: input.teacher_name?.trim() || null,
    teacher_title: input.teacher_title?.trim() || null,
    teacher_qualification: input.teacher_qualification?.trim() || null,
    teacher_experience: input.teacher_experience?.trim() || null,
    teachers: (input.teachers ?? []).filter((t) => t.name?.trim()) as never,
    cover_image: input.cover_image?.trim() || null,
    gallery: (input.gallery ?? []).filter((g) => g.path?.trim()) as never,
    capacity: input.capacity,
    max_waiting: input.max_waiting,
    min_age_months: input.min_age_months,
    max_age_months: input.max_age_months,
    description_ar: input.description_ar?.trim() || null,
    learning_style_ar: input.learning_style_ar?.trim() || null,
    schedule_ar: input.schedule_ar?.trim() || null,
    daily_schedule: (input.daily_schedule ?? []).filter((d) => d.time?.trim() || d.activity?.trim()) as never,
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
  };

  if (input.id) {
    const current = await supabase
      .from("classrooms")
      .select("id, capacity, taken_seats")
      .eq("id", input.id)
      .maybeSingle();
    if (!current.data) throw new Error("الفصل غير موجود.");
    if (payload.capacity < current.data.taken_seats) {
      throw new Error(
        `لا يمكن تقليل السعة إلى ${payload.capacity} لأن عدد المسجلين حاليًا ${current.data.taken_seats}.`,
      );
    }
    const { error } = await supabase.from("classrooms").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
    return { id: input.id, created: false };
  }

  const slug = slugify(input.slug || input.name_ar, `class-${Date.now()}`);
  const { data, error } = await supabase
    .from("classrooms")
    .insert({ ...payload, slug, taken_seats: 0 })
    .select("id")
    .single();
  if (error) {
    throw new Error(
      error.code === "23505" ? "يوجد فصل آخر بنفس المعرّف (slug) — غيّر اسم الفصل." : error.message,
    );
  }
  return { id: data.id, created: true };
}

export async function deleteClassroom(supabase: Db, userId: string, input: { id: string }) {
  await guard(supabase, userId, "seats");

  const [children, waiting] = await Promise.all([
    supabase.from("application_children").select("id", { count: "exact", head: true }).eq("classroom_id", input.id),
    supabase
      .from("waiting_list_entries")
      .select("id", { count: "exact", head: true })
      .eq("classroom_id", input.id)
      .eq("status", "waiting"),
  ]);

  const placed = children.count ?? 0;
  const queued = waiting.count ?? 0;
  if (placed > 0) {
    throw new Error(
      `لا يمكن حذف الفصل: يوجد ${placed} طالبًا مسكَّنًا فيه. انقلهم إلى فصل آخر أو أزلهم من الفصل أولًا.`,
    );
  }
  if (queued > 0) {
    throw new Error(`لا يمكن حذف الفصل: يوجد ${queued} في قائمة الانتظار. عالِج القائمة أولًا.`);
  }

  const { error } = await supabase.from("classrooms").delete().eq("id", input.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
