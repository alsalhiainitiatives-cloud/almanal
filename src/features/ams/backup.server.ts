/**
 * Server-only full backup builder.
 *
 * Produces one ZIP archive holding the registration data (JSON + CSV) plus the
 * actual uploaded documents and payment receipts, scoped to an academic year.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { zipSync, strToU8 } from "fflate";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;

const ALLOWED: AppRole[] = ["registration_officer", "principal", "supervisor", "admin"];

export async function assertBackupAccess(supabase: Db, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (!roles.some((role) => ALLOWED.includes(role))) throw new Error("forbidden");
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
}

function safeName(value: string) {
  return value.replace(/[^\w\u0600-\u06FF.-]+/g, "_").slice(0, 80);
}

export async function buildBackupZip(
  supabase: Db,
  userId: string,
  options: { academicYear?: string | null; includeFiles?: boolean },
): Promise<{ bytes: Uint8Array; fileName: string }> {
  await assertBackupAccess(supabase, userId);
  const year = options.academicYear?.trim() || null;

  let appQuery = supabase.from("applications").select("*").order("created_at");
  if (year) appQuery = appQuery.eq("academic_year", year);
  const { data: applications } = await appQuery;
  const appIds = (applications ?? []).map((a) => a.id);

  const chunk = <T>(items: T[]) => items.slice(0, 1000);
  const ids = chunk(appIds);

  const [children, documents, services, invoices, installments, receipts, reservations, reservationChildren, events] =
    await Promise.all([
      ids.length ? supabase.from("application_children").select("*").in("application_id", ids) : emptyResult(),
      ids.length ? supabase.from("application_documents").select("*").in("application_id", ids) : emptyResult(),
      ids.length ? supabase.from("application_services").select("*").in("application_id", ids) : emptyResult(),
      ids.length ? supabase.from("invoices").select("*").in("application_id", ids) : emptyResult(),
      supabase.from("installments").select("*"),
      supabase.from("payment_receipts").select("*"),
      year
        ? supabase.from("seat_reservations").select("*").eq("academic_year", year)
        : supabase.from("seat_reservations").select("*"),
      supabase.from("seat_reservation_children").select("*"),
      ids.length ? supabase.from("application_events").select("*").in("application_id", ids) : emptyResult(),
    ]);

  const files: Record<string, Uint8Array> = {};
  const tables: Record<string, unknown[]> = {
    applications: applications ?? [],
    application_children: children.data ?? [],
    application_documents: documents.data ?? [],
    application_services: services.data ?? [],
    invoices: invoices.data ?? [],
    installments: installments.data ?? [],
    payment_receipts: receipts.data ?? [],
    seat_reservations: reservations.data ?? [],
    seat_reservation_children: reservationChildren.data ?? [],
    application_events: events.data ?? [],
  };

  for (const [name, rows] of Object.entries(tables)) {
    files[`data/${name}.json`] = strToU8(JSON.stringify(rows, null, 2));
    files[`csv/${name}.csv`] = strToU8("\uFEFF" + toCsv(rows as Record<string, unknown>[]));
  }

  let downloaded = 0;
  let failed = 0;

  if (options.includeFiles !== false) {
    const childByApp = new Map<string, string>();
    for (const child of (children.data ?? []) as { application_id: string; name_ar: string }[]) {
      if (!childByApp.has(child.application_id)) childByApp.set(child.application_id, child.name_ar);
    }
    const numberByApp = new Map<string, string>();
    for (const app of applications ?? []) {
      numberByApp.set(app.id, app.application_number ?? app.id.slice(0, 8));
    }

    const docs = (documents.data ?? []) as { application_id: string; file_path: string; file_name: string | null }[];
    for (const doc of docs.slice(0, 1500)) {
      const folder = `documents/${safeName(numberByApp.get(doc.application_id) ?? "unknown")}_${safeName(
        childByApp.get(doc.application_id) ?? "",
      )}`;
      const bytes = await downloadFile(supabase, "admission-documents", doc.file_path);
      if (!bytes) {
        failed += 1;
        continue;
      }
      downloaded += 1;
      files[`${folder}/${safeName(doc.file_name ?? doc.file_path.split("/").pop() ?? "file")}`] = bytes;
    }

    const paymentFiles = (receipts.data ?? []) as { file_path: string; file_name: string | null }[];
    for (const receipt of paymentFiles.slice(0, 800)) {
      const bytes = await downloadFile(supabase, "payment-receipts", receipt.file_path);
      if (!bytes) {
        failed += 1;
        continue;
      }
      downloaded += 1;
      files[`receipts/${safeName(receipt.file_name ?? receipt.file_path.split("/").pop() ?? "receipt")}`] = bytes;
    }
  }

  files["README.txt"] = strToU8(
    [
      "نسخة احتياطية كاملة — مدارس وروضة المنال",
      `تاريخ الإصدار: ${new Date().toISOString()}`,
      `العام الدراسي: ${year ?? "كل الأعوام"}`,
      `عدد الطلبات: ${(applications ?? []).length}`,
      `المرفقات المضمّنة: ${downloaded}${failed ? ` (تعذّر تحميل ${failed})` : ""}`,
      "",
      "data/  ملفات JSON لكل جدول",
      "csv/   نفس البيانات بصيغة CSV تفتح في Excel",
      "documents/  مستندات الطلبات مرتبة بالرقم الأكاديمي",
      "receipts/   إيصالات السداد",
    ].join("\n"),
  );

  const bytes = zipSync(files, { level: 6 });
  const stamp = new Date().toISOString().slice(0, 10);
  return { bytes, fileName: `almanal-backup-${safeName(year ?? "all")}-${stamp}.zip` };
}

async function emptyResult() {
  return { data: [] as never[] };
}

async function downloadFile(supabase: Db, bucket: string, path: string) {
  try {
    const { data } = await supabase.storage.from(bucket).download(path);
    if (!data) return null;
    return new Uint8Array(await data.arrayBuffer());
  } catch {
    return null;
  }
}