import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  cancelClaim,
  createClaim,
  createOrUpdateInvoice,
  deleteBankAccount,
  deleteDiscountRule,
  deleteFeePlan,
  deleteService,
  financeOverview,
  getFinanceConfig,
  listClaimTargets,
  listInvoiceMessages,
  myFinance,
  notifyOverdue,
  postInvoiceMessage,
  quoteApplication,
  receiptUploadPath,
  recordReceipt,
  remindInstallment,
  reviewReceipt,
  saveBankAccount,
  saveDiscountRule,
  saveFeePlan,
  saveFinanceSettings,
  savePlanSettings,
  saveService,
  setInstallmentStatus,
  signReceiptUrl,
} from "./finance.server";

const uuid = z.string().uuid();
const planType = z.enum(["full", "installments"]);

export const financeConfigGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getFinanceConfig(context.supabase));

export const feePlanSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid.nullish(),
        stage_id: uuid.nullish(),
        classroom_id: uuid.nullish(),
        label_ar: z.string().trim().max(120).nullish(),
        amount: z.number().min(0).max(1_000_000),
        unit: z.enum(["month", "term", "two_terms", "year"]),
        terms_per_year: z.number().int().min(1).max(4),
        months_per_year: z.number().int().min(1).max(12),
        admission_fee: z.number().min(0).max(100_000),
        is_active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveFeePlan(context.supabase, context.userId, data));

export const feePlanDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => deleteFeePlan(context.supabase, context.userId, data.id));

export const planSettingsSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        allow_full: z.boolean(),
        full_discount_percent: z.number().min(0).max(50),
        allowed_installments: z.array(z.number().int().min(1).max(12)).max(12),
        max_installments: z.number().int().min(1).max(12),
        down_payment_percent: z.number().min(0).max(100),
        due_day: z.number().int().min(1).max(28),
        first_due_offset_days: z.number().int().min(0).max(90),
        late_after_days: z.number().int().min(0).max(30),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => savePlanSettings(context.supabase, context.userId, data));

export const discountRuleSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid.nullish(),
        name_ar: z.string().trim().min(2).max(120),
        description_ar: z.string().trim().max(300).nullish(),
        kind: z.enum(["percent", "amount"]),
        value: z.number().min(0).max(1_000_000),
        condition: z.enum(["sibling", "staff", "orphan", "early_payment", "manual"]),
        min_children: z.number().int().min(1).max(6),
        max_amount: z.number().min(0).max(1_000_000).nullish(),
        is_active: z.boolean().optional(),
        sort_order: z.number().int().min(0).max(100).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveDiscountRule(context.supabase, context.userId, data));

export const discountRuleDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => deleteDiscountRule(context.supabase, context.userId, data.id));

export const bankAccountSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid.nullish(),
        org_name_ar: z.string().trim().min(2).max(120),
        school_name_ar: z.string().trim().min(2).max(120),
        logo_url: z.string().trim().max(500).nullish(),
        account_holder: z.string().trim().min(2).max(120),
        bank_name: z.string().trim().min(2).max(120),
        account_number: z.string().trim().max(40).nullish(),
        iban: z.string().trim().max(40).nullish(),
        notes_ar: z.string().trim().max(400).nullish(),
        is_default: z.boolean().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveBankAccount(context.supabase, context.userId, data));

export const bankAccountDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => deleteBankAccount(context.supabase, context.userId, data.id));

export const financeSettingsSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        qurra_message_ar: z.string().trim().min(4).max(500),
        qurra_services_message_ar: z.string().trim().min(4).max(700),
        whatsapp_template: z.string().trim().min(10).max(800),
        reminder_days_before: z.number().int().min(0).max(30),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveFinanceSettings(context.supabase, context.userId, data));

export const financeQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        applicationId: uuid,
        planType,
        installments: z.number().int().min(1).max(12).default(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { quote, schedule, settings } = await quoteApplication(
      context.supabase,
      data.applicationId,
      data.planType,
      data.installments,
    );
    return { quote, schedule, settings };
  });

export const financePlanChoose = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        applicationId: uuid,
        planType,
        installments: z.number().int().min(1).max(12).default(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) =>
    createOrUpdateInvoice(context.supabase, context.userId, data),
  );

export const myFinanceGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => myFinance(context.supabase, context.userId));

export const financeOverviewGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => financeOverview(context.supabase, context.userId));

export const receiptPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ invoiceId: uuid, fileName: z.string().max(200) }).parse(data),
  )
  .handler(async ({ data, context }) => ({
    path: receiptUploadPath(context.userId, data.invoiceId, data.fileName),
  }));

export const receiptRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        invoiceId: uuid,
        installmentId: uuid.nullish(),
        filePath: z.string().max(500),
        fileName: z.string().max(200),
        amount: z.number().min(0).max(1_000_000),
        transferDate: z.string().max(20).nullish(),
        referenceNo: z.string().max(60).nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => recordReceipt(context.supabase, context.userId, data));

export const receiptSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ path: z.string().max(500) }).parse(data))
  .handler(async ({ data, context }) => signReceiptUrl(context.supabase, context.userId, data.path));

export const receiptReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: uuid, approve: z.boolean(), note: z.string().max(400).nullish() }).parse(data),
  )
  .handler(async ({ data, context }) => reviewReceipt(context.supabase, context.userId, data));

export const installmentSetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["due", "paid", "waived", "cancelled"]),
        note: z.string().max(400).nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => setInstallmentStatus(context.supabase, context.userId, data));

export const installmentRemind = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ installmentId: uuid }).parse(data))
  .handler(async ({ data, context }) => remindInstallment(context.supabase, context.userId, data));

export const serviceSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid.nullish(),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(60)
          .regex(/^[a-z0-9_-]+$/, "المعرّف بالإنجليزية فقط"),
        name_ar: z.string().trim().min(2).max(120),
        description_ar: z.string().trim().max(400).nullish(),
        category: z.enum([
          "transportation",
          "uniform",
          "books",
          "meals",
          "activities",
          "other",
        ]),
        price: z.number().min(0).max(1_000_000),
        price_note: z.string().trim().max(120).nullish(),
        is_required: z.boolean().optional(),
        sort_order: z.number().int().min(0).max(100).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveService(context.supabase, context.userId, data));

export const serviceDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => deleteService(context.supabase, context.userId, data.id));

export const overdueNotifyAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => notifyOverdue(context.supabase, context.userId));

export const invoiceMessagesGet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ invoiceId: uuid }).parse(data))
  .handler(async ({ data, context }) =>
    listInvoiceMessages(context.supabase, context.userId, data.invoiceId),
  );

export const invoiceMessageSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ invoiceId: uuid, body: z.string().trim().min(1).max(1000) }).parse(data),
  )
  .handler(async ({ data, context }) =>
    postInvoiceMessage(context.supabase, context.userId, data),
  );
/* ---------------- Annual financial claims ---------------- */

export const financeClaimsGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listClaimTargets(context.supabase, context.userId));

export const financeClaimCreate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        applicationId: uuid,
        academicYear: z.string().trim().min(4).max(60),
        planType,
        installments: z.number().int().min(1).max(12),
        tuitionTotal: z.number().min(0).max(1_000_000),
        admissionFee: z.number().min(0).max(200_000),
        servicesTotal: z.number().min(0).max(200_000),
        discountTotal: z.number().min(0).max(1_000_000),
        startDate: z.string().trim().max(20).nullish(),
        note: z.string().trim().max(500).nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => createClaim(context.supabase, context.userId, data));

export const financeClaimCancel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ invoiceId: uuid }).parse(data))
  .handler(async ({ data, context }) => cancelClaim(context.supabase, context.userId, data.invoiceId));
