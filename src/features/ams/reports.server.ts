/**
 * Server-only analytics service for the AMS reports centre.
 * Runs entirely as the signed-in staff member (RLS enforced).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { can } from "./roles";

type Db = SupabaseClient<Database>;

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const QURRA_LABELS: Record<string, string> = {
  eligible: "مستحق مبدئيًا",
  waiting_school_review: "بانتظار مراجعة المدرسة",
  submitted_to_qurra: "مُرسل إلى قرة",
  waiting_response: "بانتظار رد قرة",
  approved: "معتمد من قرة",
  rejected: "مرفوض من قرة",
  not_requested: "غير مطلوب",
};

const GENDER_LABELS: Record<string, string> = { male: "ذكر", female: "أنثى" };

function ageOf(birth: string | null): number | null {
  if (!birth) return null;
  const diff = Date.now() - new Date(birth).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.max(0, Math.round((diff / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10);
}

async function guardReports(supabase: Db, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (!can(roles, "reports")) throw new Error("ليس لديك صلاحية الاطلاع على التقارير.");
  return roles;
}

export type ReportsPayload = Awaited<ReturnType<typeof getReports>>;

export async function getReports(supabase: Db, userId: string) {
  await guardReports(supabase, userId);

  const [
    apps,
    profiles,
    stages,
    classrooms,
    invoices,
    installments,
    receipts,
    docs,
    docRequests,
    waitlist,
    messages,
    testimonials,
    services,
  ] = await Promise.all([
    supabase
      .from("applications")
      .select(
        `id, application_number, status, academic_year, priority, seat_status, payment_status, created_at, submitted_at, reviewed_at, decided_at, archived_at,
           parent_id, parent_national_id, parent_nationality, parent_relationship, stage_id, classroom_id,
           admission_fee, tuition_total, services_total, discount_total, grand_total,
           application_children(id, name_ar, name_en, national_id, gender, birth_date, nationality, birth_place, blood_type, medical_conditions, allergies, special_needs, previous_school, last_grade, stage_id, classroom_id),
           qurra_requests(status, requested, mother_national_id, mother_employment_status, mother_employer, mother_job_title, decided_at, decision_note)`,
      )
      .limit(2000),
    supabase.from("profiles").select("id, full_name, email, phone, created_at").limit(2000),
    supabase.from("stages").select("id, name_ar, total_seats, taken_seats, sort_order").order("sort_order"),
    supabase
      .from("classrooms")
      .select("id, stage_id, name_ar, capacity, taken_seats, is_active")
      .order("sort_order"),
    supabase
      .from("invoices")
      .select(
        "id, application_id, parent_id, status, plan_type, installments_count, grand_total, paid_total, discount_total, services_total, tuition_total, qurra_covered, academic_year, created_at",
      )
      .limit(2000),
    supabase
      .from("installments")
      .select("id, invoice_id, seq, amount, paid_amount, due_date, status")
      .limit(5000),
    supabase.from("payment_receipts").select("id, invoice_id, status, amount, created_at").limit(2000),
    supabase.from("application_documents").select("id, application_id, status, created_at").limit(5000),
    supabase.from("document_requests").select("id, application_id, fulfilled_at, created_at").limit(2000),
    supabase.from("waiting_list_entries").select("id, classroom_id, status").limit(2000),
    supabase.from("contact_messages").select("id, program, created_at").limit(2000),
    supabase.from("site_testimonials").select("id, status, rating, created_at").limit(1000),
    supabase.from("application_services").select("id, application_id, service_id, price_at_selection").limit(5000),
  ]);

  const allApps = apps.data ?? [];
  const live = allApps.filter((a) => !a.archived_at && a.status !== "draft");
  const profileMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const stageMap = new Map((stages.data ?? []).map((s) => [s.id, s]));
  const classMap = new Map((classrooms.data ?? []).map((c) => [c.id, c]));
  const invoiceByApp = new Map((invoices.data ?? []).map((i) => [i.application_id, i]));

  const qurraRow = (row: (typeof allApps)[number]) =>
    ((row.qurra_requests as unknown as Record<string, string | null>[] | null)?.[0] ?? null);

  const num = (v: unknown) => Number(v ?? 0);

  const decided = live.filter((a) => a.status === "approved" || a.status === "rejected");
  const durations = live
    .filter((a) => a.submitted_at && a.decided_at)
    .map((a) => (new Date(a.decided_at!).getTime() - new Date(a.submitted_at!).getTime()) / 86400000);
  const childrenAll = live.flatMap(
    (a) => (a.application_children ?? []) as unknown as Record<string, string | null>[],
  );

  const kpis = {
    totalApplications: allApps.length,
    drafts: allApps.filter((a) => a.status === "draft").length,
    submitted: live.length,
    students: childrenAll.length,
    parents: new Set(live.map((a) => a.parent_id)).size,
    approved: live.filter((a) => a.status === "approved").length,
    rejected: live.filter((a) => a.status === "rejected").length,
    waitlisted: live.filter((a) => a.status === "waitlisted").length,
    needsAction: live.filter((a) => a.status === "needs_action").length,
    inReview: live.filter((a) => ["submitted", "under_review", "principal_review"].includes(a.status)).length,
    conversion: live.length
      ? Math.round((live.filter((a) => a.status === "approved").length / live.length) * 100)
      : 0,
    decisionRate: live.length ? Math.round((decided.length / live.length) * 100) : 0,
    avgDecisionDays: durations.length
      ? Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10
      : 0,
    seatsCapacity: (classrooms.data ?? []).reduce((s, c) => s + c.capacity, 0),
    seatsTaken: (classrooms.data ?? []).reduce((s, c) => s + c.taken_seats, 0),
    waitingList: (waitlist.data ?? []).filter((w) => w.status === "waiting").length,
    contactMessages: (messages.data ?? []).length,
    testimonials: (testimonials.data ?? []).length,
    testimonialsPending: (testimonials.data ?? []).filter((t) => t.status === "pending").length,
  };

  const billed = (invoices.data ?? []).reduce((s, i) => s + num(i.grand_total), 0);
  const collected = (invoices.data ?? []).reduce((s, i) => s + num(i.paid_total), 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = (installments.data ?? []).filter((i) => i.status !== "paid" && i.due_date < today);
  const finance = {
    billed,
    collected,
    outstanding: billed - collected,
    collectionRate: billed > 0 ? Math.round((collected / billed) * 100) : 0,
    discounts: (invoices.data ?? []).reduce((s, i) => s + num(i.discount_total), 0),
    servicesRevenue: (invoices.data ?? []).reduce((s, i) => s + num(i.services_total), 0),
    invoices: (invoices.data ?? []).length,
    paidInvoices: (invoices.data ?? []).filter((i) => i.status === "paid").length,
    installments: (installments.data ?? []).length,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((s, i) => s + (num(i.amount) - num(i.paid_amount)), 0),
    receiptsPending: (receipts.data ?? []).filter((r) => r.status === "pending").length,
    receiptsApproved: (receipts.data ?? []).filter((r) => r.status === "approved").length,
    receiptsRejected: (receipts.data ?? []).filter((r) => r.status === "rejected").length,
    qurraCoveredInvoices: (invoices.data ?? []).filter((i) => i.qurra_covered).length,
    planFull: (invoices.data ?? []).filter((i) => i.plan_type === "full").length,
    planInstallments: (invoices.data ?? []).filter((i) => i.plan_type !== "full").length,
  };

  const documents = {
    total: (docs.data ?? []).length,
    pending: (docs.data ?? []).filter((d) => d.status === "pending").length,
    approved: (docs.data ?? []).filter((d) => d.status === "approved").length,
    rejected: (docs.data ?? []).filter((d) => d.status === "rejected").length,
    openRequests: (docRequests.data ?? []).filter((d) => !d.fulfilled_at).length,
  };

  const monthKeys: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MONTHS_AR[d.getMonth()],
    });
  }
  const monthOf = (v: string | null) => (v ? v.slice(0, 7) : "");
  const trend = monthKeys.map((m) => ({
    month: m.label,
    submitted: live.filter((a) => monthOf(a.submitted_at ?? a.created_at) === m.key).length,
    approved: live.filter((a) => a.status === "approved" && monthOf(a.decided_at ?? a.submitted_at) === m.key)
      .length,
    rejected: live.filter((a) => a.status === "rejected" && monthOf(a.decided_at ?? a.submitted_at) === m.key)
      .length,
    messages: (messages.data ?? []).filter((c) => monthOf(c.created_at) === m.key).length,
    collected: Math.round(
      (receipts.data ?? [])
        .filter((r) => r.status === "approved" && monthOf(r.created_at) === m.key)
        .reduce((s, r) => s + num(r.amount), 0),
    ),
  }));

  const countBy = <T,>(rows: T[], key: (row: T) => string) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const k = key(row) || "غير محدد";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const statusBreakdown = countBy(live, (a) => a.status);
  const stageBreakdown = (stages.data ?? []).map((stage) => {
    const rooms = (classrooms.data ?? []).filter((c) => c.stage_id === stage.id);
    return {
      name: stage.name_ar,
      applications: live.filter((a) => a.stage_id === stage.id).length,
      students: childrenAll.filter((c) => c.stage_id === stage.id).length,
      capacity: rooms.reduce((s, c) => s + c.capacity, 0),
      taken: rooms.reduce((s, c) => s + c.taken_seats, 0),
    };
  });
  const classroomBreakdown = (classrooms.data ?? [])
    .filter((c) => c.is_active)
    .map((c) => ({
      name: c.name_ar,
      stage: stageMap.get(c.stage_id)?.name_ar ?? "",
      capacity: c.capacity,
      taken: c.taken_seats,
      available: Math.max(0, c.capacity - c.taken_seats),
      waiting: (waitlist.data ?? []).filter((w) => w.classroom_id === c.id && w.status === "waiting").length,
      occupancy: c.capacity ? Math.round((c.taken_seats / c.capacity) * 100) : 0,
    }));

  const genderBreakdown = countBy(childrenAll, (c) => GENDER_LABELS[c.gender ?? ""] ?? "غير محدد");
  const nationalityBreakdown = countBy(childrenAll, (c) => c.nationality ?? "غير محدد").slice(0, 8);
  const ageBreakdown = ["أقل من 3", "3 - 4", "4 - 5", "5 - 6", "6 وأكثر"].map((name) => ({ name, value: 0 }));
  for (const child of childrenAll) {
    const age = ageOf(child.birth_date ?? null);
    if (age === null) continue;
    const idx = age < 3 ? 0 : age < 4 ? 1 : age < 5 ? 2 : age < 6 ? 3 : 4;
    ageBreakdown[idx].value += 1;
  }
  const qurraBreakdown = countBy(
    live,
    (a) => QURRA_LABELS[qurraRow(a)?.status ?? "not_requested"] ?? "غير محدد",
  );
  const programInterest = countBy(messages.data ?? [], (m) => m.program ?? "غير محدد").slice(0, 8);

  const students = live.flatMap((app) => {
    const parent = profileMap.get(app.parent_id);
    const invoice = invoiceByApp.get(app.id);
    const q = qurraRow(app);
    return ((app.application_children ?? []) as unknown as Record<string, string | null>[]).map((child) => ({
      application_number: app.application_number ?? "",
      status: app.status,
      academic_year: app.academic_year,
      submitted_at: app.submitted_at ?? app.created_at,
      child_name_ar: child.name_ar ?? "",
      child_name_en: child.name_en ?? "",
      child_national_id: child.national_id ?? "",
      gender: GENDER_LABELS[child.gender ?? ""] ?? "",
      birth_date: child.birth_date ?? "",
      age: ageOf(child.birth_date ?? null) ?? "",
      nationality: child.nationality ?? "",
      birth_place: child.birth_place ?? "",
      blood_type: child.blood_type ?? "",
      medical_conditions: child.medical_conditions ?? "",
      allergies: child.allergies ?? "",
      special_needs: child.special_needs ?? "",
      previous_school: child.previous_school ?? "",
      last_grade: child.last_grade ?? "",
      stage: stageMap.get(child.stage_id ?? app.stage_id ?? "")?.name_ar ?? "",
      classroom: classMap.get(child.classroom_id ?? "")?.name_ar ?? "",
      parent_name: parent?.full_name ?? "",
      parent_phone: parent?.phone ?? "",
      parent_email: parent?.email ?? "",
      parent_national_id: app.parent_national_id ?? "",
      parent_nationality: app.parent_nationality ?? "",
      parent_relationship: app.parent_relationship ?? "",
      qurra_status: QURRA_LABELS[q?.status ?? "not_requested"] ?? "",
      seat_status: app.seat_status,
      payment_status: app.payment_status,
      admission_fee: num(app.admission_fee),
      tuition_total: num(app.tuition_total),
      services_total: num(app.services_total),
      discount_total: num(app.discount_total),
      grand_total: num(app.grand_total),
      invoice_paid: num(invoice?.paid_total),
      invoice_remaining: num(invoice?.grand_total) - num(invoice?.paid_total),
      invoice_status: invoice?.status ?? "بدون فاتورة",
    }));
  });

  const qurraStudents = live
    .filter((app) => {
      const q = qurraRow(app);
      return Boolean(q) && q?.status !== "not_requested";
    })
    .flatMap((app) => {
      const parent = profileMap.get(app.parent_id);
      const invoice = invoiceByApp.get(app.id);
      const q = qurraRow(app) ?? {};
      return ((app.application_children ?? []) as unknown as Record<string, string | null>[]).map((child) => ({
        application_number: app.application_number ?? "",
        child_name_ar: child.name_ar ?? "",
        child_national_id: child.national_id ?? "",
        birth_date: child.birth_date ?? "",
        age: ageOf(child.birth_date ?? null) ?? "",
        gender: GENDER_LABELS[child.gender ?? ""] ?? "",
        stage: stageMap.get(child.stage_id ?? app.stage_id ?? "")?.name_ar ?? "",
        classroom: classMap.get(child.classroom_id ?? "")?.name_ar ?? "",
        parent_name: parent?.full_name ?? "",
        parent_phone: parent?.phone ?? "",
        parent_national_id: app.parent_national_id ?? "",
        mother_national_id: q.mother_national_id ?? "",
        mother_employment_status: q.mother_employment_status ?? "",
        mother_employer: q.mother_employer ?? "",
        mother_job_title: q.mother_job_title ?? "",
        qurra_status: QURRA_LABELS[q.status ?? "not_requested"] ?? "",
        qurra_decided_at: q.decided_at ?? "",
        qurra_note: q.decision_note ?? "",
        application_status: app.status,
        tuition_total: num(app.tuition_total),
        discount_total: num(app.discount_total),
        grand_total: num(app.grand_total),
        qurra_covered: invoice?.qurra_covered ? "نعم" : "لا",
        invoice_expected: num(invoice?.grand_total),
        invoice_paid: num(invoice?.paid_total),
        invoice_remaining: num(invoice?.grand_total) - num(invoice?.paid_total),
        invoice_status: invoice?.status ?? "بدون فاتورة",
      }));
    });

  const parentsRows = [...new Set(live.map((a) => a.parent_id))].map((parentId) => {
    const parent = profileMap.get(parentId);
    const own = live.filter((a) => a.parent_id === parentId);
    const inv = (invoices.data ?? []).filter((i) => i.parent_id === parentId);
    return {
      parent_name: parent?.full_name ?? "",
      parent_phone: parent?.phone ?? "",
      parent_email: parent?.email ?? "",
      national_id: own[0]?.parent_national_id ?? "",
      nationality: own[0]?.parent_nationality ?? "",
      relationship: own[0]?.parent_relationship ?? "",
      applications: own.length,
      children: own.reduce((s, a) => s + ((a.application_children ?? []) as unknown[]).length, 0),
      billed: inv.reduce((s, i) => s + num(i.grand_total), 0),
      paid: inv.reduce((s, i) => s + num(i.paid_total), 0),
      remaining: inv.reduce((s, i) => s + num(i.grand_total) - num(i.paid_total), 0),
      registered_at: parent?.created_at ?? "",
    };
  });

  const financeRows = (invoices.data ?? []).map((invoice) => {
    const app = allApps.find((a) => a.id === invoice.application_id);
    const parent = profileMap.get(invoice.parent_id);
    const rows = (installments.data ?? []).filter((i) => i.invoice_id === invoice.id);
    return {
      application_number: app?.application_number ?? "",
      parent_name: parent?.full_name ?? "",
      parent_phone: parent?.phone ?? "",
      academic_year: invoice.academic_year,
      plan: invoice.plan_type === "full" ? "دفعة واحدة" : `${invoice.installments_count} دفعات`,
      status: invoice.status,
      grand_total: num(invoice.grand_total),
      paid_total: num(invoice.paid_total),
      remaining: num(invoice.grand_total) - num(invoice.paid_total),
      discount_total: num(invoice.discount_total),
      qurra_covered: invoice.qurra_covered ? "نعم" : "لا",
      installments: rows.length,
      overdue: rows.filter((r) => r.status !== "paid" && r.due_date < today).length,
      next_due:
        rows
          .filter((r) => r.status !== "paid")
          .sort((a, b) => a.due_date.localeCompare(b.due_date))[0]?.due_date ?? "",
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    kpis,
    finance,
    documents,
    trend,
    statusBreakdown,
    stageBreakdown,
    classroomBreakdown,
    genderBreakdown,
    nationalityBreakdown,
    ageBreakdown,
    qurraBreakdown,
    programInterest,
    servicesSelected: (services.data ?? []).length,
    datasets: { students, qurraStudents, parents: parentsRows, finance: financeRows },
  };
}