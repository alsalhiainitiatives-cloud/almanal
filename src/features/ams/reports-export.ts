/** Client-side export helpers: CSV (Excel-safe), XLS workbook, and print/PDF. */

export type Column = { key: string; label: string };

export type Row = Record<string, string | number | null | undefined>;

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export function exportCsv(name: string, columns: Column[], rows: Row[]) {
  const lines = [columns.map((c) => c.label), ...rows.map((row) => columns.map((c) => row[c.key] ?? ""))];
  const csv = lines
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  download(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${name}-${stamp()}.csv`);
}

/** Excel-compatible single-sheet workbook (HTML table with xls extension). */
export function exportExcel(name: string, title: string, columns: Column[], rows: Row[]) {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(row[c.key])}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html dir="rtl"><head><meta charset="utf-8" /><style>
    table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}
    th,td{border:1px solid #999;padding:6px;text-align:right;white-space:nowrap}
    th{background:#7A1F3D;color:#fff;font-weight:bold}
    caption{font-size:16px;font-weight:bold;padding:8px}
  </style></head><body><table><caption>${escapeHtml(title)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  download(
    new Blob([`\uFEFF${html}`], { type: "application/vnd.ms-excel;charset=utf-8" }),
    `${name}-${stamp()}.xls`,
  );
}

/** Opens a print-ready RTL document; the browser dialog saves it as PDF. */
export function exportPdf(title: string, columns: Column[], rows: Row[], subtitle?: string) {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(row[c.key])}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page{size:A4 landscape;margin:12mm}
    body{font-family:"Cairo","Segoe UI",Tahoma,sans-serif;color:#231f20}
    h1{font-size:18px;margin:0 0 4px;color:#7A1F3D}
    p{font-size:11px;margin:0 0 12px;color:#666}
    table{width:100%;border-collapse:collapse;font-size:9.5px}
    th,td{border:1px solid #d8cfc9;padding:4px 5px;text-align:right}
    th{background:#7A1F3D;color:#fff}
    tbody tr:nth-child(even){background:#faf6f3}
  </style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(subtitle ?? "")} — روضة ومدارس المنال · ${new Date().toLocaleString("ar-SA")}</p>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}

export const STUDENT_COLUMNS: Column[] = [
  { key: "application_number", label: "رقم الطلب" },
  { key: "status", label: "حالة الطلب" },
  { key: "academic_year", label: "العام الدراسي" },
  { key: "submitted_at", label: "تاريخ التقديم" },
  { key: "child_name_ar", label: "اسم الطالب" },
  { key: "child_name_en", label: "الاسم بالإنجليزية" },
  { key: "child_national_id", label: "هوية الطالب" },
  { key: "gender", label: "الجنس" },
  { key: "birth_date", label: "تاريخ الميلاد" },
  { key: "age", label: "العمر" },
  { key: "nationality", label: "الجنسية" },
  { key: "birth_place", label: "مكان الميلاد" },
  { key: "blood_type", label: "فصيلة الدم" },
  { key: "medical_conditions", label: "حالات صحية" },
  { key: "allergies", label: "حساسية" },
  { key: "special_needs", label: "احتياجات خاصة" },
  { key: "previous_school", label: "المدرسة السابقة" },
  { key: "last_grade", label: "آخر صف" },
  { key: "stage", label: "المرحلة" },
  { key: "classroom", label: "الفصل" },
  { key: "parent_name", label: "ولي الأمر" },
  { key: "parent_phone", label: "الجوال" },
  { key: "parent_email", label: "البريد" },
  { key: "parent_national_id", label: "هوية ولي الأمر" },
  { key: "parent_nationality", label: "جنسية ولي الأمر" },
  { key: "parent_relationship", label: "صلة القرابة" },
  { key: "qurra_status", label: "حالة قرة" },
  { key: "seat_status", label: "حالة المقعد" },
  { key: "payment_status", label: "حالة السداد" },
  { key: "admission_fee", label: "رسوم التسجيل" },
  { key: "tuition_total", label: "الرسوم الدراسية" },
  { key: "services_total", label: "الخدمات" },
  { key: "discount_total", label: "الخصومات" },
  { key: "grand_total", label: "الإجمالي" },
  { key: "invoice_paid", label: "المسدد" },
  { key: "invoice_remaining", label: "المتبقي" },
  { key: "invoice_status", label: "حالة الفاتورة" },
];

export const QURRA_COLUMNS: Column[] = [
  { key: "application_number", label: "رقم الطلب" },
  { key: "child_name_ar", label: "اسم الطالب" },
  { key: "child_national_id", label: "هوية الطالب" },
  { key: "birth_date", label: "تاريخ الميلاد" },
  { key: "age", label: "العمر" },
  { key: "gender", label: "الجنس" },
  { key: "stage", label: "المرحلة" },
  { key: "classroom", label: "الفصل" },
  { key: "parent_name", label: "ولي الأمر" },
  { key: "parent_phone", label: "الجوال" },
  { key: "parent_national_id", label: "هوية ولي الأمر" },
  { key: "mother_national_id", label: "هوية الأم" },
  { key: "mother_employment_status", label: "حالة عمل الأم" },
  { key: "mother_employer", label: "جهة العمل" },
  { key: "mother_job_title", label: "المسمى الوظيفي" },
  { key: "qurra_status", label: "حالة قرة" },
  { key: "qurra_decided_at", label: "تاريخ القرار" },
  { key: "qurra_note", label: "ملاحظة القرار" },
  { key: "application_status", label: "حالة الطلب" },
  { key: "tuition_total", label: "الرسوم الدراسية" },
  { key: "discount_total", label: "الخصومات" },
  { key: "grand_total", label: "الإجمالي" },
  { key: "qurra_covered", label: "مغطى بقرة" },
  { key: "invoice_expected", label: "المبلغ المتوقع" },
  { key: "invoice_paid", label: "المحوّل/المسدد" },
  { key: "invoice_remaining", label: "الفرق المتبقي" },
  { key: "invoice_status", label: "حالة الفاتورة" },
];

export const PARENT_COLUMNS: Column[] = [
  { key: "parent_name", label: "ولي الأمر" },
  { key: "parent_phone", label: "الجوال" },
  { key: "parent_email", label: "البريد" },
  { key: "national_id", label: "الهوية" },
  { key: "nationality", label: "الجنسية" },
  { key: "relationship", label: "صلة القرابة" },
  { key: "applications", label: "عدد الطلبات" },
  { key: "children", label: "عدد الأبناء" },
  { key: "billed", label: "إجمالي المفوتر" },
  { key: "paid", label: "المسدد" },
  { key: "remaining", label: "المتبقي" },
  { key: "registered_at", label: "تاريخ التسجيل" },
];

export const FINANCE_COLUMNS: Column[] = [
  { key: "application_number", label: "رقم الطلب" },
  { key: "parent_name", label: "ولي الأمر" },
  { key: "parent_phone", label: "الجوال" },
  { key: "academic_year", label: "العام الدراسي" },
  { key: "plan", label: "خطة السداد" },
  { key: "status", label: "حالة الفاتورة" },
  { key: "grand_total", label: "الإجمالي" },
  { key: "paid_total", label: "المسدد" },
  { key: "remaining", label: "المتبقي" },
  { key: "discount_total", label: "الخصومات" },
  { key: "qurra_covered", label: "مغطى بقرة" },
  { key: "installments", label: "عدد الدفعات" },
  { key: "overdue", label: "دفعات متأخرة" },
  { key: "next_due", label: "الاستحقاق القادم" },
];