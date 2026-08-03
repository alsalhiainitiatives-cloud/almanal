/**
 * Server-only service for attachment policy settings and the destructive
 * "purge registration data" operation (export-gated, admin only).
 */
import { createHmac, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import {
  DEFAULT_UPLOAD_SETTINGS,
  PURGE_PHRASE,
  UPLOAD_SETTINGS_KEY,
  normalizeUploadSettings,
  type UploadSettings,
} from "./upload-settings";

type Db = SupabaseClient<Database>;

async function rolesOf(supabase: Db, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

async function guardBuilder(supabase: Db, userId: string) {
  const roles = await rolesOf(supabase, userId);
  if (!roles.includes("admin") && !roles.includes("supervisor")) {
    throw new Error("هذا القسم متاح لمدير النظام والمشرف فقط.");
  }
  return roles;
}

async function guardAdminOnly(supabase: Db, userId: string) {
  const roles = await rolesOf(supabase, userId);
  if (!roles.includes("admin")) {
    throw new Error("حذف بيانات التسجيل متاح لمدير النظام فقط.");
  }
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

export async function getUploadSettings(supabase: Db): Promise<UploadSettings> {
  const { data } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", UPLOAD_SETTINGS_KEY)
    .maybeSingle();
  return normalizeUploadSettings(data?.data ?? DEFAULT_UPLOAD_SETTINGS);
}

export async function saveUploadSettings(supabase: Db, userId: string, input: unknown) {
  await guardBuilder(supabase, userId);
  const settings = normalizeUploadSettings(input);
  const { error } = await supabase
    .from("site_content")
    .upsert(
      { key: UPLOAD_SETTINGS_KEY, data: settings as never, updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error("تعذّر حفظ إعدادات المرفقات.");
  return settings;
}

/* ------------------------------------------------------------------ */
/* Export + purge                                                      */
/* ------------------------------------------------------------------ */

function secret() {
  return process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_URL"] ?? "manal";
}

function signToken(userId: string, issuedAt: number) {
  const body = `${userId}.${issuedAt}`;
  const sig = createHmac("sha256", secret()).update(body).digest("hex").slice(0, 32);
  return `${body}.${sig}`;
}

function verifyToken(userId: string, token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("يجب تصدير البيانات قبل الحذف النهائي.");
  const [tokenUser, issuedRaw, sig] = parts;
  const issued = Number(issuedRaw);
  if (tokenUser !== userId || !Number.isFinite(issued)) {
    throw new Error("رمز التصدير غير صالح — كرّر التصدير ثم أعد المحاولة.");
  }
  const expected = createHmac("sha256", secret()).update(`${tokenUser}.${issuedRaw}`).digest("hex").slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("رمز التصدير غير صالح — كرّر التصدير ثم أعد المحاولة.");
  }
  if (Date.now() - issued > 30 * 60 * 1000) {
    throw new Error("انتهت صلاحية رمز التصدير (30 دقيقة) — كرّر التصدير ثم أعد المحاولة.");
  }
}

/** Full registration dataset dump, plus a short-lived token that unlocks the purge. */
export async function exportRegistrationData(supabase: Db, userId: string) {
  await guardAdminOnly(supabase, userId);
  const db = await admin();

  const [apps, children, docs, services, qurra, events, notes, invoices, installments, receipts, waiting] =
    await Promise.all([
      db.from("applications").select("*").order("created_at"),
      db.from("application_children").select("*").order("created_at"),
      db.from("application_documents").select("*").order("created_at"),
      db.from("application_services").select("*"),
      db.from("qurra_requests").select("*"),
      db.from("application_events").select("*").order("created_at"),
      db.from("application_notes").select("*").order("created_at"),
      db.from("invoices").select("*").order("created_at"),
      db.from("installments").select("*").order("created_at"),
      db.from("payment_receipts").select("*").order("created_at"),
      db.from("waiting_list_entries").select("*").order("created_at"),
    ]);

  const issuedAt = Date.now();
  return {
    exportedAt: new Date(issuedAt).toISOString(),
    token: signToken(userId, issuedAt),
    counts: {
      applications: apps.data?.length ?? 0,
      children: children.data?.length ?? 0,
      documents: docs.data?.length ?? 0,
      invoices: invoices.data?.length ?? 0,
      receipts: receipts.data?.length ?? 0,
      waitingList: waiting.data?.length ?? 0,
    },
    data: {
      applications: apps.data ?? [],
      application_children: children.data ?? [],
      application_documents: docs.data ?? [],
      application_services: services.data ?? [],
      qurra_requests: qurra.data ?? [],
      application_events: events.data ?? [],
      application_notes: notes.data ?? [],
      invoices: invoices.data ?? [],
      installments: installments.data ?? [],
      payment_receipts: receipts.data ?? [],
      waiting_list_entries: waiting.data ?? [],
    },
  };
}

/** Live counts shown in the danger zone before any destructive action. */
export async function registrationDataStats(supabase: Db, userId: string) {
  await guardBuilder(supabase, userId);
  const count = async (table: "applications" | "application_children" | "application_documents" | "invoices" | "payment_receipts") => {
    const { count: c, error } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (error) throw new Error("تعذّر تحميل إحصاءات بيانات التسجيل.");
    return c ?? 0;
  };
  const [applications, children, documents, invoices, receipts] = await Promise.all([
    count("applications"),
    count("application_children"),
    count("application_documents"),
    count("invoices"),
    count("payment_receipts"),
  ]);
  return { applications, children, documents, invoices, receipts };
}

/**
 * Permanently deletes every registration record (applications cascade to
 * children, documents, invoices, receipts…) and the stored attachment files.
 * Requires a fresh export token and the exact confirmation phrase.
 */
export async function purgeRegistrationData(
  supabase: Db,
  userId: string,
  input: { token: string; confirm: string },
) {
  await guardAdminOnly(supabase, userId);
  if (input.confirm.trim() !== PURGE_PHRASE) {
    throw new Error(`كلمة التأكيد غير مطابقة — اكتب «${PURGE_PHRASE}» بالضبط.`);
  }
  verifyToken(userId, input.token);

  const db = await admin();

  // Best-effort storage cleanup before the rows disappear.
  const [{ data: docRows }, { data: receiptRows }] = await Promise.all([
    db.from("application_documents").select("file_path"),
    db.from("payment_receipts").select("file_path"),
  ]);
  const chunk = <T,>(list: T[], size = 100) =>
    Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

  for (const batch of chunk((docRows ?? []).map((d) => d.file_path).filter(Boolean))) {
    await db.storage.from("admission-documents").remove(batch);
  }
  for (const batch of chunk((receiptRows ?? []).map((r) => r.file_path).filter(Boolean))) {
    await db.storage.from("payment-receipts").remove(batch);
  }

  const { count: before } = await db.from("applications").select("id", { count: "exact", head: true });
  const { error } = await db
    .from("applications")
    .delete()
    .not("id", "is", null);
  if (error) throw new Error("تعذّر حذف بيانات التسجيل.");

  // Reset seat counters so the new cycle starts clean.
  await db.from("classrooms").update({ taken_seats: 0 }).not("id", "is", null);
  await db.from("stages").update({ taken_seats: 0 }).not("id", "is", null);

  return { ok: true as const, deletedApplications: before ?? 0 };
}
