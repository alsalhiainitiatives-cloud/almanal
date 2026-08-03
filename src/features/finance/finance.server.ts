/**
 * Server-only finance service: settings, invoices, installments and receipts.
 *
 * Parents may only touch their own invoice through the guarded helpers below;
 * every ledger write goes through the admin client AFTER ownership and role
 * checks so totals can never be tampered with from the browser.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import { notify } from "@/features/notifications/notifications.server";
import type { Database } from "@/integrations/supabase/types";
import {
  annualTuition,
  buildSchedule,
  computeQuote,
  type DiscountRuleRow,
  type PlanSettingsRow,
} from "./pricing";

type Db = SupabaseClient<Database>;

export const ACADEMIC_YEAR = "2026-2027 / 1448هـ";
const FINANCE_ROLES: AppRole[] = ["admin", "principal", "accountant"];

async function rolesOf(supabase: Db, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

async function guardFinance(supabase: Db, userId: string) {
  const roles = await rolesOf(supabase, userId);
  if (!roles.some((r) => FINANCE_ROLES.includes(r))) {
    throw new Error("هذا الإجراء متاح لقسم الحسابات ومدير النظام فقط.");
  }
  return roles;
}

async function isStaff(supabase: Db, userId: string) {
  const roles = await rolesOf(supabase, userId);
  return roles.some((r) => r !== "parent");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export async function getFinanceConfig(supabase: Db) {
  const [plans, settings, discounts, banks, general, stages, classrooms, services] = await Promise.all([
    supabase.from("fee_plans").select("*").order("created_at"),
    supabase.from("payment_plan_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("discount_rules").select("*").order("sort_order"),
    supabase.from("bank_accounts").select("*").order("is_default", { ascending: false }).order("updated_at", { ascending: false }),
    supabase.from("finance_settings").select("*").limit(1).maybeSingle(),
    supabase.from("stages").select("id, name_ar, slug, sort_order").order("sort_order"),
    supabase.from("classrooms").select("id, name_ar, stage_id, sort_order").order("sort_order"),
    supabase.from("services").select("*").order("sort_order"),
  ]);
  return {
    feePlans: plans.data ?? [],
    planSettings: settings.data ?? null,
    discountRules: discounts.data ?? [],
    bankAccounts: banks.data ?? [],
    settings: general.data ?? null,
    stages: stages.data ?? [],
    classrooms: classrooms.data ?? [],
    services: services.data ?? [],
  };
}

export async function saveService(
  supabase: Db,
  userId: string,
  input: {
    id?: string | null;
    slug: string;
    name_ar: string;
    description_ar?: string | null;
    category: Database["public"]["Enums"]["service_category"];
    price: number;
    price_note?: string | null;
    is_required?: boolean;
    sort_order?: number;
    is_active?: boolean;
  },
) {
  await guardFinance(supabase, userId);
  const payload = {
    slug: input.slug,
    name_ar: input.name_ar,
    description_ar: input.description_ar ?? null,
    category: input.category,
    price: input.price,
    price_note: input.price_note ?? null,
    is_required: input.is_required ?? false,
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
  };
  const query = input.id
    ? supabase.from("services").update(payload).eq("id", input.id)
    : supabase.from("services").insert(payload);
  const { error } = await query;
  if (error) throw new Error("تعذّر حفظ الخدمة الإضافية.");
  return { ok: true };
}

export async function deleteService(supabase: Db, userId: string, id: string) {
  await guardFinance(supabase, userId);
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف الخدمة — قد تكون مرتبطة بطلبات قائمة.");
  return { ok: true };
}

/** Notifies every parent with an overdue (or soon-due) installment. */
export async function notifyOverdue(supabase: Db, userId: string) {
  await guardFinance(supabase, userId);
  const db = await admin();
  const { data: settings } = await db
    .from("payment_plan_settings")
    .select("late_after_days")
    .eq("academic_year", ACADEMIC_YEAR)
    .maybeSingle();
  const lateAfter = Number(settings?.late_after_days ?? 0);
  const limit = new Date();
  limit.setDate(limit.getDate() - lateAfter);

  const { data: rows } = await db
    .from("installments")
    .select("id, seq, amount, due_date, status, invoices(parent_id, application_id)")
    .in("status", ["due", "pending_review"])
    .lte("due_date", limit.toISOString().slice(0, 10));

  let sent = 0;
  for (const row of rows ?? []) {
    const invoice = (row as unknown as { invoices: { parent_id: string; application_id: string } })
      .invoices;
    if (!invoice) continue;
    await notify(supabase, {
      userIds: [invoice.parent_id],
      kind: "finance.payment_overdue",
      title: `تأخر سداد الدفعة رقم ${row.seq}`,
      body: `المبلغ ${Math.round(Number(row.amount))} ر.س — كان تاريخ الاستحقاق ${row.due_date}`,
      applicationId: invoice.application_id,
      link: "/payments",
      severity: "urgent",
    });
    sent += 1;
  }
  return { sent };
}

export async function saveFeePlan(
  supabase: Db,
  userId: string,
  input: {
    id?: string | null;
    stage_id?: string | null;
    classroom_id?: string | null;
    label_ar?: string | null;
    amount: number;
    unit: string;
    terms_per_year: number;
    months_per_year: number;
    admission_fee: number;
    is_active?: boolean;
  },
) {
  await guardFinance(supabase, userId);
  const payload = {
    stage_id: input.stage_id || null,
    classroom_id: input.classroom_id || null,
    academic_year: ACADEMIC_YEAR,
    label_ar: input.label_ar ?? null,
    amount: input.amount,
    unit: input.unit,
    terms_per_year: input.terms_per_year,
    months_per_year: input.months_per_year,
    admission_fee: input.admission_fee,
    is_active: input.is_active ?? true,
  };
  const query = input.id
    ? supabase.from("fee_plans").update(payload).eq("id", input.id)
    : supabase.from("fee_plans").insert(payload);
  const { error } = await query;
  if (error) throw new Error("تعذّر حفظ خطة الرسوم.");
  return { ok: true };
}

export async function deleteFeePlan(supabase: Db, userId: string, id: string) {
  await guardFinance(supabase, userId);
  const { error } = await supabase.from("fee_plans").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف خطة الرسوم.");
  return { ok: true };
}

export async function savePlanSettings(
  supabase: Db,
  userId: string,
  input: Partial<PlanSettingsRow>,
) {
  await guardFinance(supabase, userId);
  const { error } = await supabase
    .from("payment_plan_settings")
    .update({
      allow_full: input.allow_full,
      full_discount_percent: input.full_discount_percent,
      allowed_installments: input.allowed_installments,
      max_installments: input.max_installments,
      down_payment_percent: input.down_payment_percent,
      due_day: input.due_day,
      first_due_offset_days: input.first_due_offset_days,
      late_after_days: input.late_after_days,
    })
    .eq("academic_year", ACADEMIC_YEAR);
  if (error) throw new Error("تعذّر حفظ إعدادات خطة السداد.");
  return { ok: true };
}

export async function saveDiscountRule(
  supabase: Db,
  userId: string,
  input: Partial<Omit<DiscountRuleRow, "id">> & { id?: string | null; name_ar: string },
) {
  await guardFinance(supabase, userId);
  const payload = {
    name_ar: input.name_ar,
    description_ar: input.description_ar ?? null,
    kind: input.kind ?? "percent",
    value: input.value ?? 0,
    condition: input.condition ?? "manual",
    min_children: input.min_children ?? 1,
    max_amount: input.max_amount ?? null,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
  };
  const query = input.id
    ? supabase.from("discount_rules").update(payload).eq("id", input.id)
    : supabase.from("discount_rules").insert(payload);
  const { error } = await query;
  if (error) throw new Error("تعذّر حفظ قاعدة الخصم.");
  return { ok: true };
}

export async function deleteDiscountRule(supabase: Db, userId: string, id: string) {
  await guardFinance(supabase, userId);
  const { error } = await supabase.from("discount_rules").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف قاعدة الخصم.");
  return { ok: true };
}

export async function saveBankAccount(
  supabase: Db,
  userId: string,
  input: {
    id?: string | null;
    org_name_ar: string;
    school_name_ar: string;
    logo_url?: string | null;
    account_holder: string;
    bank_name: string;
    account_number?: string | null;
    iban?: string | null;
    notes_ar?: string | null;
    is_default?: boolean;
    is_active?: boolean;
  },
) {
  await guardFinance(supabase, userId);
  const payload = {
    org_name_ar: input.org_name_ar,
    school_name_ar: input.school_name_ar,
    logo_url: input.logo_url ?? null,
    account_holder: input.account_holder,
    bank_name: input.bank_name,
    account_number: input.account_number ?? null,
    iban: input.iban ?? null,
    notes_ar: input.notes_ar ?? null,
    is_default: input.is_default ?? false,
    is_active: input.is_active ?? true,
  };
  if (payload.is_default) {
    await supabase.from("bank_accounts").update({ is_default: false }).neq("id", input.id ?? "00000000-0000-0000-0000-000000000000");
  }
  const query = input.id
    ? supabase.from("bank_accounts").update(payload).eq("id", input.id)
    : supabase.from("bank_accounts").insert(payload);
  const { error } = await query;
  if (error) throw new Error("تعذّر حفظ بيانات الحساب البنكي.");
  return { ok: true };
}

export async function deleteBankAccount(supabase: Db, userId: string, id: string) {
  await guardFinance(supabase, userId);
  const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف الحساب البنكي.");
  return { ok: true };
}

export async function saveFinanceSettings(
  supabase: Db,
  userId: string,
  input: {
    id: string;
    qurra_message_ar: string;
    qurra_services_message_ar: string;
    whatsapp_template: string;
    reminder_days_before: number;
  },
) {
  await guardFinance(supabase, userId);
  const { error } = await supabase
    .from("finance_settings")
    .update({
      qurra_message_ar: input.qurra_message_ar,
      qurra_services_message_ar: input.qurra_services_message_ar,
      whatsapp_template: input.whatsapp_template,
      reminder_days_before: input.reminder_days_before,
    })
    .eq("id", input.id);
  if (error) throw new Error("تعذّر حفظ الإعدادات المالية.");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Quotes                                                              */
/* ------------------------------------------------------------------ */

async function loadQuoteContext(supabase: Db, applicationId: string) {
  const { data: app } = await supabase
    .from("applications")
    .select("id, parent_id, stage_id, classroom_id, academic_year")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) throw new Error("الطلب غير موجود.");

  const [children, chosen, plans, settings, discounts, qurra] = await Promise.all([
    supabase.from("application_children").select("id, name_ar, stage_id, classroom_id").eq("application_id", applicationId),
    supabase
      .from("application_services")
      .select("price_at_selection, services(name_ar)")
      .eq("application_id", applicationId),
    supabase.from("fee_plans").select("*").eq("is_active", true),
    supabase.from("payment_plan_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("discount_rules").select("*").eq("is_active", true),
    supabase.from("qurra_requests").select("status, requested").eq("application_id", applicationId).maybeSingle(),
  ]);

  const kids = children.data ?? [];
  const feePlans = plans.data ?? [];
  const planFor = (child: { stage_id: string | null; classroom_id: string | null }) =>
    feePlans.find((p) => p.classroom_id && p.classroom_id === child.classroom_id) ??
    feePlans.find((p) => p.stage_id && p.stage_id === (child.stage_id ?? app.stage_id)) ??
    null;

  let tuitionSum = 0;
  let admissionSum = 0;
  for (const child of kids.length ? kids : [{ stage_id: app.stage_id, classroom_id: app.classroom_id }]) {
    const plan = planFor(child as { stage_id: string | null; classroom_id: string | null });
    if (plan) {
      tuitionSum += annualTuition(plan);
      admissionSum += Number(plan.admission_fee ?? 0);
    }
  }
  const childCount = Math.max(1, kids.length);

  const services = (chosen.data ?? []).map((row) => ({
    name: (row as unknown as { services?: { name_ar?: string } }).services?.name_ar ?? "خدمة إضافية",
    price: Number(row.price_at_selection),
  }));

  return {
    app,
    childCount,
    tuitionPerChild: tuitionSum / childCount,
    admissionFeePerChild: admissionSum / childCount,
    services,
    settings: settings.data as PlanSettingsRow | null,
    discountRules: (discounts.data ?? []) as unknown as DiscountRuleRow[],
    qurraCovered: qurra.data?.status === "approved",
  };
}

export async function quoteApplication(
  supabase: Db,
  applicationId: string,
  planType: "full" | "installments",
  installments: number,
) {
  const ctx = await loadQuoteContext(supabase, applicationId);
  const quote = computeQuote({
    childCount: ctx.childCount,
    admissionFeePerChild: ctx.admissionFeePerChild,
    tuitionPerChild: ctx.tuitionPerChild,
    services: ctx.services,
    planType,
    settings: ctx.settings,
    discountRules: ctx.discountRules,
    qurraCovered: ctx.qurraCovered,
  });
  const schedule = buildSchedule({
    total: quote.payableTotal,
    count: planType === "full" ? 1 : installments,
    settings: ctx.settings,
  });
  return { quote, schedule, settings: ctx.settings, services: ctx.services, app: ctx.app };
}

/* ------------------------------------------------------------------ */
/* Invoice lifecycle                                                   */
/* ------------------------------------------------------------------ */

export async function createOrUpdateInvoice(
  supabase: Db,
  userId: string,
  input: { applicationId: string; planType: "full" | "installments"; installments: number },
) {
  const { data: app } = await supabase
    .from("applications")
    .select("id, parent_id, application_number")
    .eq("id", input.applicationId)
    .maybeSingle();
  if (!app) throw new Error("الطلب غير موجود.");
  if (app.parent_id !== userId && !(await isStaff(supabase, userId))) {
    throw new Error("غير مصرح بتعديل الخطة المالية لهذا الطلب.");
  }

  const { quote, schedule } = await quoteApplication(
    supabase,
    input.applicationId,
    input.planType,
    input.installments,
  );

  const db = await admin();
  const { data: existing } = await db
    .from("invoices")
    .select("id, paid_total, status")
    .eq("application_id", input.applicationId)
    .eq("academic_year", ACADEMIC_YEAR)
    .maybeSingle();

  if (existing && Number(existing.paid_total) > 0) {
    throw new Error("تم سداد جزء من الفاتورة — تواصل مع قسم الحسابات لتعديل الخطة.");
  }

  const payload = {
    application_id: input.applicationId,
    parent_id: app.parent_id,
    academic_year: ACADEMIC_YEAR,
    status: "active" as const,
    plan_type: input.planType,
    installments_count: input.planType === "full" ? 1 : input.installments,
    admission_fee: quote.admissionFee,
    tuition_total: quote.tuition,
    services_total: quote.servicesTotal,
    discount_total: quote.discountTotal,
    grand_total: quote.payableTotal,
    qurra_covered: quote.qurraCovered,
  };

  let invoiceId = existing?.id ?? null;
  if (invoiceId) {
    await db.from("invoices").update(payload).eq("id", invoiceId);
    await db.from("invoice_items").delete().eq("invoice_id", invoiceId);
    await db.from("installments").delete().eq("invoice_id", invoiceId);
  } else {
    const { data: created, error } = await db.from("invoices").insert(payload).select("id").single();
    if (error || !created) throw new Error("تعذّر إنشاء الفاتورة.");
    invoiceId = created.id;
  }

  const items = [
    { kind: "admission", label_ar: "رسوم القبول والتسجيل", amount: quote.admissionFee, qurra_covered: false },
    {
      kind: "tuition",
      label_ar: "الرسوم الدراسية",
      amount: quote.tuition,
      qurra_covered: quote.qurraCovered,
    },
    ...quote.discounts.map((d) => ({
      kind: "discount",
      label_ar: d.label,
      amount: -d.amount,
      qurra_covered: false,
    })),
  ];
  const { services } = await quoteApplication(supabase, input.applicationId, input.planType, input.installments);
  for (const svc of services) {
    items.push({ kind: "service", label_ar: svc.name, amount: svc.price, qurra_covered: false });
  }

  await db.from("invoice_items").insert(items.map((i) => ({ ...i, invoice_id: invoiceId! })));
  await db.from("installments").insert(
    schedule.map((row) => ({
      invoice_id: invoiceId!,
      seq: row.seq,
      amount: row.amount,
      due_date: row.dueDate,
    })),
  );

  await db.from("invoices").update({ paid_total: 0 }).eq("id", invoiceId!);
  await syncPaymentStatus(db, input.applicationId, {
    grandTotal: quote.payableTotal,
    paid: 0,
    qurraCovered: quote.qurraCovered,
  });

  await notify(supabase, {
    roles: ["accountant", "admin"],
    kind: "finance.plan_selected",
    title: "اختار ولي الأمر خطة السداد",
    body:
      input.planType === "full"
        ? "سداد دفعة واحدة"
        : `جدولة على ${input.installments} دفعات`,
    applicationId: input.applicationId,
    link: "/ams/finance",
    severity: "info",
  });

  return { invoiceId, quote, schedule };
}

export async function myFinance(supabase: Db, userId: string) {
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, applications(application_number, status, academic_year)")
    .eq("parent_id", userId)
    .order("created_at", { ascending: false });

  const ids = (invoices ?? []).map((i) => i.id);
  const [installments, receipts, banks, settings, plan, approved, messages] = await Promise.all([
    ids.length
      ? supabase.from("installments").select("*").in("invoice_id", ids).order("seq")
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("payment_receipts").select("*").in("invoice_id", ids).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("bank_accounts").select("*").eq("is_active", true).order("is_default", { ascending: false }),
    supabase.from("finance_settings").select("*").limit(1).maybeSingle(),
    supabase.from("payment_plan_settings").select("*").eq("academic_year", ACADEMIC_YEAR).maybeSingle(),
    supabase
      .from("applications")
      .select("id, application_number, status, academic_year")
      .eq("parent_id", userId)
      .eq("status", "approved"),
    ids.length
      ? supabase.from("invoice_messages").select("*").in("invoice_id", ids).order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

  const invoicedApps = new Set((invoices ?? []).map((i) => i.application_id));

  return {
    invoices: invoices ?? [],
    installments: installments.data ?? [],
    receipts: receipts.data ?? [],
    bankAccounts: banks.data ?? [],
    settings: settings.data ?? null,
    planSettings: plan.data ?? null,
    messages: messages.data ?? [],
    /** Approved applications that still need the parent to pick a payment plan. */
    pendingPlans: (approved.data ?? []).filter((a) => !invoicedApps.has(a.id)),
  };
}

/* ------------------------------------------------------------------ */
/* Parent ⇄ accountant conversation                                    */
/* ------------------------------------------------------------------ */

async function guardInvoiceAccess(supabase: Db, userId: string, invoiceId: string) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, parent_id, application_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) throw new Error("الفاتورة غير موجودة.");
  const staff = await isStaff(supabase, userId);
  if (invoice.parent_id !== userId && !staff) {
    throw new Error("غير مصرح بالوصول لهذه المحادثة المالية.");
  }
  return { invoice, staff };
}

export async function listInvoiceMessages(supabase: Db, userId: string, invoiceId: string) {
  await guardInvoiceAccess(supabase, userId, invoiceId);
  const { data } = await supabase
    .from("invoice_messages")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at");
  const authorIds = [...new Set((data ?? []).map((m) => m.author_id))];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  return (data ?? []).map((m) => ({ ...m, author_name: names.get(m.author_id) ?? "مستخدم" }));
}

export async function postInvoiceMessage(
  supabase: Db,
  userId: string,
  input: { invoiceId: string; body: string },
) {
  const { invoice, staff } = await guardInvoiceAccess(supabase, userId, input.invoiceId);
  const { error } = await supabase.from("invoice_messages").insert({
    invoice_id: input.invoiceId,
    author_id: userId,
    is_staff: staff,
    body: input.body.trim().slice(0, 1000),
  });
  if (error) throw new Error("تعذّر إرسال الرسالة.");

  await notify(
    supabase,
    staff
      ? {
          userIds: [invoice.parent_id],
          kind: "finance.message",
          title: "رسالة جديدة من قسم الحسابات",
          body: input.body.slice(0, 160),
          applicationId: invoice.application_id,
          link: "/payments",
          severity: "info",
        }
      : {
          roles: ["accountant", "admin"],
          kind: "finance.message",
          title: "رسالة مالية جديدة من ولي الأمر",
          body: input.body.slice(0, 160),
          applicationId: invoice.application_id,
          link: "/ams/finance",
          severity: "info",
        },
  );
  return { ok: true };
}

export async function financeOverview(supabase: Db, userId: string) {
  if (!(await isStaff(supabase, userId))) throw new Error("غير مصرح بالوصول للنظام المالي.");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, applications(application_number, status, parent_id, academic_year)")
    .order("created_at", { ascending: false })
    .limit(400);

  const ids = (invoices ?? []).map((i) => i.id);
  const parentIds = [...new Set((invoices ?? []).map((i) => i.parent_id))];

  const [installments, receipts, profiles, children, settings, plan] = await Promise.all([
    ids.length ? supabase.from("installments").select("*").in("invoice_id", ids).order("seq") : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("payment_receipts").select("*").in("invoice_id", ids).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    parentIds.length
      ? supabase.from("profiles").select("id, full_name, phone, email").in("id", parentIds)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase
          .from("application_children")
          .select("application_id, name_ar")
          .in(
            "application_id",
            (invoices ?? []).map((i) => i.application_id),
          )
      : Promise.resolve({ data: [] }),
    supabase.from("finance_settings").select("*").limit(1).maybeSingle(),
    supabase.from("payment_plan_settings").select("*").eq("academic_year", ACADEMIC_YEAR).maybeSingle(),
  ]);

  return {
    invoices: invoices ?? [],
    installments: installments.data ?? [],
    receipts: receipts.data ?? [],
    profiles: profiles.data ?? [],
    children: children.data ?? [],
    settings: settings.data ?? null,
    planSettings: plan.data ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Receipts & payments                                                 */
/* ------------------------------------------------------------------ */

export function receiptUploadPath(userId: string, invoiceId: string, fileName: string) {
  const safe = fileName.replace(/[^\w.\-\u0600-\u06FF]+/g, "_").slice(-80);
  return `${userId}/${invoiceId}/${Date.now()}-${safe}`;
}

export async function recordReceipt(
  supabase: Db,
  userId: string,
  input: {
    invoiceId: string;
    installmentId?: string | null;
    filePath: string;
    fileName: string;
    amount: number;
    transferDate?: string | null;
    referenceNo?: string | null;
  },
) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, parent_id, application_id")
    .eq("id", input.invoiceId)
    .maybeSingle();
  if (!invoice) throw new Error("الفاتورة غير موجودة.");
  if (invoice.parent_id !== userId && !(await isStaff(supabase, userId))) {
    throw new Error("غير مصرح برفع إيصال لهذه الفاتورة.");
  }

  const { error } = await supabase.from("payment_receipts").insert({
    invoice_id: input.invoiceId,
    installment_id: input.installmentId ?? null,
    uploaded_by: userId,
    file_path: input.filePath,
    file_name: input.fileName,
    amount: input.amount,
    transfer_date: input.transferDate ?? null,
    reference_no: input.referenceNo ?? null,
  });
  if (error) throw new Error("تعذّر حفظ الإيصال.");

  if (input.installmentId) {
    const db = await admin();
    await db.from("installments").update({ status: "pending_review" }).eq("id", input.installmentId);
  }

  await notify(supabase, {
    roles: ["accountant", "admin"],
    kind: "finance.receipt_uploaded",
    title: "إيصال سداد جديد بانتظار الاعتماد",
    body: `تم رفع إيصال بمبلغ ${Math.round(input.amount)} ر.س`,
    applicationId: invoice.application_id,
    link: "/ams/finance",
    severity: "info",
  });

  return { ok: true };
}

export async function signReceiptUrl(supabase: Db, userId: string, path: string) {
  const owner = path.split("/")[0];
  if (owner !== userId && !(await isStaff(supabase, userId))) {
    throw new Error("غير مصرح بعرض هذا الإيصال.");
  }
  const db = await admin();
  const { data, error } = await db.storage.from("payment-receipts").createSignedUrl(path, 60 * 10);
  if (error || !data) throw new Error("تعذّر فتح الإيصال.");
  return { url: data.signedUrl };
}

export async function reviewReceipt(
  supabase: Db,
  userId: string,
  input: { id: string; approve: boolean; note?: string | null },
) {
  await guardFinance(supabase, userId);
  const db = await admin();
  const { data: receipt } = await db
    .from("payment_receipts")
    .select("*, invoices(id, parent_id, application_id, grand_total, paid_total)")
    .eq("id", input.id)
    .maybeSingle();
  if (!receipt) throw new Error("الإيصال غير موجود.");

  await db
    .from("payment_receipts")
    .update({
      status: input.approve ? "approved" : "rejected",
      review_note: input.note ?? null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  const invoice = (receipt as unknown as { invoices: { id: string; parent_id: string; application_id: string } }).invoices;

  if (receipt.installment_id) {
    await db
      .from("installments")
      .update(
        input.approve
          ? { status: "paid", paid_amount: receipt.amount, paid_at: new Date().toISOString() }
          : { status: "due" },
      )
      .eq("id", receipt.installment_id);
  }

  if (input.approve) await recalcInvoice(db, invoice.id);

  await notify(supabase, {
    userIds: [invoice.parent_id],
    kind: input.approve ? "finance.receipt_approved" : "finance.receipt_rejected",
    title: input.approve ? "تم اعتماد إيصال السداد" : "تم رفض إيصال السداد",
    body: input.note ?? undefined,
    applicationId: invoice.application_id,
    link: "/payments",
    severity: input.approve ? "success" : "warning",
  });

  return { ok: true };
}

export async function setInstallmentStatus(
  supabase: Db,
  userId: string,
  input: { id: string; status: "due" | "paid" | "waived" | "cancelled"; note?: string | null },
) {
  await guardFinance(supabase, userId);
  const db = await admin();
  const { data: row } = await db.from("installments").select("*").eq("id", input.id).maybeSingle();
  if (!row) throw new Error("الدفعة غير موجودة.");

  await db
    .from("installments")
    .update({
      status: input.status,
      note: input.note ?? row.note,
      paid_amount: input.status === "paid" ? row.amount : 0,
      paid_at: input.status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", input.id);

  await recalcInvoice(db, row.invoice_id);
  return { ok: true };
}

export async function remindInstallment(
  supabase: Db,
  userId: string,
  input: { installmentId: string },
) {
  await guardFinance(supabase, userId);
  const db = await admin();
  const { data: row } = await db
    .from("installments")
    .select("*, invoices(parent_id, application_id)")
    .eq("id", input.installmentId)
    .maybeSingle();
  if (!row) throw new Error("الدفعة غير موجودة.");
  const invoice = (row as unknown as { invoices: { parent_id: string; application_id: string } }).invoices;

  await notify(supabase, {
    userIds: [invoice.parent_id],
    kind: "finance.payment_due",
    title: `تذكير بدفعة مستحقة رقم ${row.seq}`,
    body: `المبلغ ${Math.round(Number(row.amount))} ر.س — تاريخ الاستحقاق ${row.due_date}`,
    applicationId: invoice.application_id,
    link: "/payments",
    severity: "warning",
  });
  return { ok: true };
}

async function recalcInvoice(db: Db, invoiceId: string) {
  const { data: invoice } = await db
    .from("invoices")
    .select("id, application_id, grand_total, qurra_covered")
    .eq("id", invoiceId)
    .maybeSingle();
  const { data: rows } = await db.from("installments").select("amount, status, paid_amount").eq("invoice_id", invoiceId);
  const paid = (rows ?? []).reduce(
    (sum, r) => sum + (r.status === "paid" ? Number(r.paid_amount || r.amount) : 0),
    0,
  );
  const outstanding = (rows ?? []).some((r) => r.status === "due" || r.status === "pending_review");
  await db
    .from("invoices")
    .update({ paid_total: paid, status: outstanding ? "active" : "paid" })
    .eq("id", invoiceId);

  if (invoice) {
    await syncPaymentStatus(db, invoice.application_id, {
      grandTotal: Number(invoice.grand_total),
      paid,
      qurraCovered: Boolean(invoice.qurra_covered),
    });
  }
}

/**
 * Payment status on the application is always derived — never set by hand.
 * It follows the invoice the parent created when picking a payment plan.
 */
async function syncPaymentStatus(
  db: Db,
  applicationId: string,
  input: { grandTotal: number; paid: number; qurraCovered: boolean },
) {
  const status =
    input.grandTotal <= 0
      ? input.qurraCovered
        ? "waived"
        : "paid"
      : input.paid >= input.grandTotal
        ? "paid"
        : input.paid > 0
          ? "partial"
          : "unpaid";
  await db.from("applications").update({ payment_status: status }).eq("id", applicationId);
}