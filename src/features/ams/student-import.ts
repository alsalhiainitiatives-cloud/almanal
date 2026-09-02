/**
 * Client-safe spec for the Student Affairs import/export sheet.
 *
 * One source of truth for: the downloadable Excel template, the parser that
 * reads a filled sheet back, and the row validator that runs before import.
 */
import { z } from "zod";

export type ImportColumn = {
  key: string;
  label: string;
  width: number;
  required?: boolean;
  hint?: string;
};

/** Sheet columns — order matters, headers are matched by label. */
export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name_ar", label: "اسم الطالب (رباعي)", width: 30, required: true },
  { key: "name_en", label: "الاسم بالإنجليزية", width: 26 },
  { key: "national_id", label: "هوية / إقامة الطالب", width: 18, hint: "10 أرقام" },
  { key: "gender", label: "الجنس", width: 10, required: true, hint: "ذكر أو أنثى" },
  { key: "birth_date", label: "تاريخ الميلاد", width: 16, required: true, hint: "YYYY-MM-DD" },
  { key: "nationality", label: "الجنسية", width: 14 },
  { key: "birth_place", label: "مكان الميلاد", width: 16 },
  { key: "stage", label: "المرحلة", width: 18, required: true, hint: "كما هي في النظام" },
  { key: "classroom", label: "الفصل", width: 18, hint: "اختياري" },
  { key: "blood_type", label: "فصيلة الدم", width: 12 },
  { key: "medical_conditions", label: "حالات صحية", width: 22 },
  { key: "allergies", label: "حساسية", width: 18 },
  { key: "special_needs", label: "احتياجات خاصة", width: 20 },
  { key: "previous_school", label: "المدرسة السابقة", width: 22 },
  { key: "last_grade", label: "آخر صف", width: 14 },
  { key: "vaccination_status", label: "حالة التحصينات", width: 16 },
  { key: "parent_name", label: "اسم ولي الأمر", width: 26, required: true },
  { key: "parent_relationship", label: "صلة القرابة", width: 14 },
  { key: "parent_national_id", label: "هوية ولي الأمر", width: 18 },
  { key: "parent_nationality", label: "جنسية ولي الأمر", width: 16 },
  { key: "parent_phone", label: "جوال ولي الأمر", width: 16, required: true, hint: "05XXXXXXXX" },
  { key: "parent_email", label: "البريد الإلكتروني", width: 24 },
  { key: "notes", label: "ملاحظات", width: 26 },
];

export type SheetRow = Record<string, string>;

/** What the server accepts for a single imported / edited student. */
export const studentRecordSchema = z.object({
  name_ar: z.string().trim().min(3).max(120),
  name_en: z.string().trim().max(120).nullish(),
  national_id: z.string().trim().max(20).nullish(),
  gender: z.enum(["male", "female"]),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nationality: z.string().trim().max(60).nullish(),
  birth_place: z.string().trim().max(80).nullish(),
  stage_id: z.string().uuid(),
  classroom_id: z.string().uuid().nullish(),
  blood_type: z.string().trim().max(10).nullish(),
  medical_conditions: z.string().trim().max(400).nullish(),
  allergies: z.string().trim().max(400).nullish(),
  special_needs: z.string().trim().max(400).nullish(),
  previous_school: z.string().trim().max(120).nullish(),
  last_grade: z.string().trim().max(60).nullish(),
  vaccination_status: z.string().trim().max(60).nullish(),
  parent_name: z.string().trim().min(3).max(120),
  parent_relationship: z.string().trim().max(40).nullish(),
  parent_national_id: z.string().trim().max(20).nullish(),
  parent_nationality: z.string().trim().max(60).nullish(),
  parent_phone: z.string().trim().min(9).max(20),
  parent_email: z.string().trim().max(120).nullish(),
  notes: z.string().trim().max(500).nullish(),
});

export type StudentRecord = z.infer<typeof studentRecordSchema>;

export type ValidatedRow = {
  index: number;
  raw: SheetRow;
  record: StudentRecord | null;
  errors: string[];
  stageName: string;
  classroomName: string;
};

const ARABIC_DIGITS = /[٠-٩]/g;

export function normalizeDigits(value: string) {
  return value.replace(ARABIC_DIGITS, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function normalizeGender(value?: string | null): "male" | "female" | null {
  const v = String(value ?? "").trim();
  if (["ذكر", "طالب", "ولد", "male", "m", "M"].includes(v)) return "male";
  if (["أنثى", "انثى", "طالبة", "بنت", "female", "f", "F"].includes(v)) return "female";
  return null;
}

/** Accepts ISO, D/M/YYYY, D-M-YYYY and Excel date cells (already stringified). */
export function normalizeDate(value?: string | null): string | null {
  const raw = normalizeDigits(String(value ?? "").trim());
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2]!.padStart(2, "0")}-${iso[3]!.padStart(2, "0")}`;
  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export function normalizePhone(value?: string | null): string | null {
  const raw = normalizeDigits(String(value ?? "")).replace(/[\s()-]/g, "");
  if (!raw) return null;
  if (raw.startsWith("+966")) return `0${raw.slice(4)}`;
  if (raw.startsWith("966")) return `0${raw.slice(3)}`;
  if (/^5\d{8}$/.test(raw)) return `0${raw}`;
  return raw;
}

const clean = (value?: string | null) => {
  const v = String(value ?? "").trim();
  return v ? v : null;
};

const norm = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export type StageLite = { id: string; name_ar: string };
export type ClassroomLite = { id: string; name_ar: string; stage_id: string | null };

/** Validates a parsed sheet row and resolves stage/classroom names to ids. */
export function validateRow(
  raw: SheetRow,
  index: number,
  stages: StageLite[],
  classrooms: ClassroomLite[],
): ValidatedRow {
  const errors: string[] = [];
  const stage = stages.find((s) => norm(s.name_ar) === norm(raw.stage));
  const classroomName = clean(raw.classroom);
  const classroom = classroomName
    ? classrooms.find(
        (c) => norm(c.name_ar) === norm(classroomName) && (!stage || c.stage_id === stage.id),
      )
    : undefined;

  const gender = normalizeGender(raw.gender);
  const birth = normalizeDate(raw.birth_date);
  const phone = normalizePhone(raw.parent_phone);
  const nationalId = clean(raw.national_id) ? normalizeDigits(String(raw.national_id).trim()) : null;

  if (!clean(raw.name_ar) || String(raw.name_ar).trim().length < 3) errors.push("اسم الطالب مطلوب");
  if (!gender) errors.push("الجنس يجب أن يكون «ذكر» أو «أنثى»");
  if (!birth) errors.push("تاريخ ميلاد غير صحيح");
  if (!stage) errors.push("المرحلة غير مطابقة للمراحل في النظام");
  if (classroomName && !classroom) errors.push("الفصل غير مطابق لفصول المرحلة");
  if (!clean(raw.parent_name)) errors.push("اسم ولي الأمر مطلوب");
  if (!phone || phone.replace(/\D/g, "").length < 9) errors.push("جوال ولي الأمر غير صحيح");
  if (nationalId && !/^\d{10}$/.test(nationalId)) errors.push("هوية الطالب يجب أن تكون 10 أرقام");

  const record =
    errors.length === 0 && gender && birth && stage && phone
      ? ({
          name_ar: String(raw.name_ar).trim(),
          name_en: clean(raw.name_en),
          national_id: nationalId,
          gender,
          birth_date: birth,
          nationality: clean(raw.nationality),
          birth_place: clean(raw.birth_place),
          stage_id: stage.id,
          classroom_id: classroom?.id ?? null,
          blood_type: clean(raw.blood_type),
          medical_conditions: clean(raw.medical_conditions),
          allergies: clean(raw.allergies),
          special_needs: clean(raw.special_needs),
          previous_school: clean(raw.previous_school),
          last_grade: clean(raw.last_grade),
          vaccination_status: clean(raw.vaccination_status),
          parent_name: String(raw.parent_name).trim(),
          parent_relationship: clean(raw.parent_relationship),
          parent_national_id: clean(raw.parent_national_id)
            ? normalizeDigits(String(raw.parent_national_id).trim())
            : null,
          parent_nationality: clean(raw.parent_nationality),
          parent_phone: phone,
          parent_email: clean(raw.parent_email),
          notes: clean(raw.notes),
        } satisfies StudentRecord)
      : null;

  return {
    index,
    raw,
    record,
    errors,
    stageName: stage?.name_ar ?? clean(raw.stage) ?? "—",
    classroomName: classroom?.name_ar ?? classroomName ?? "—",
  };
}

/* ------------------------------------------------------------------ */
/* Excel template + parser (exceljs is loaded lazily in the browser)   */
/* ------------------------------------------------------------------ */

const BURGUNDY = "FF7A1F3D";
const CREAM = "FFFAF6F3";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Builds and downloads a fully formatted, ready-to-fill Excel template. */
export async function downloadImportTemplate(
  stages: StageLite[],
  classrooms: ClassroomLite[],
  academicYear: string,
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "روضة ومدارس المنال";
  wb.created = new Date();

  const sheet = wb.addWorksheet("الطلاب", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
    properties: { defaultRowHeight: 20 },
  });

  sheet.mergeCells(1, 1, 1, IMPORT_COLUMNS.length);
  const title = sheet.getCell(1, 1);
  title.value = `نموذج استيراد الطلاب — روضة ومدارس المنال · العام الدراسي ${academicYear}`;
  title.font = { name: "Cairo", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BURGUNDY } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 34;

  const header = sheet.getRow(2);
  const hints = sheet.getRow(3);
  IMPORT_COLUMNS.forEach((col, i) => {
    const c = i + 1;
    sheet.getColumn(c).width = col.width;
    const cell = header.getCell(c);
    cell.value = col.label + (col.required ? " *" : "");
    cell.font = { name: "Cairo", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: col.required ? BURGUNDY : "FFB64A6A" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD8CFC9" } },
      bottom: { style: "thin", color: { argb: "FFD8CFC9" } },
      left: { style: "thin", color: { argb: "FFD8CFC9" } },
      right: { style: "thin", color: { argb: "FFD8CFC9" } },
    };
    const hint = hints.getCell(c);
    hint.value = col.hint ?? "";
    hint.font = { name: "Cairo", size: 9, italic: true, color: { argb: "FF8A7F79" } };
    hint.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
    hint.alignment = { horizontal: "center", vertical: "middle" };
  });
  header.height = 30;

  const colIndex = (key: string) => IMPORT_COLUMNS.findIndex((c) => c.key === key) + 1;
  const stageList = stages.map((s) => s.name_ar).join(",");
  const classList = classrooms.map((c) => c.name_ar).join(",");

  for (let row = 4; row <= 500; row += 1) {
    const r = sheet.getRow(row);
    r.height = 22;
    IMPORT_COLUMNS.forEach((_col, i) => {
      const cell = r.getCell(i + 1);
      cell.font = { name: "Cairo", size: 11 };
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE6DED9" } } };
    });
    r.getCell(colIndex("gender")).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"ذكر,أنثى"'],
    };
    if (stageList.length < 250)
      r.getCell(colIndex("stage")).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${stageList}"`],
      };
    if (classList.length < 250)
      r.getCell(colIndex("classroom")).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${classList}"`],
      };
    const birth = r.getCell(colIndex("birth_date"));
    birth.numFmt = "yyyy-mm-dd";
  }

  const guide = wb.addWorksheet("التعليمات", { views: [{ rightToLeft: true }] });
  guide.getColumn(1).width = 26;
  guide.getColumn(2).width = 70;
  const lines: [string, string][] = [
    ["تعليمات الاستيراد", ""],
    ["١", "لا تحذف صف العناوين ولا تغيّر أسماء الأعمدة — النظام يقرأ البيانات بناءً عليها."],
    ["٢", "ابدأ إدخال البيانات من الصف الرابع، صف واحد لكل طالب."],
    ["٣", "الحقول المعلَّمة بـ * إلزامية: اسم الطالب، الجنس، تاريخ الميلاد، المرحلة، ولي الأمر، الجوال."],
    ["٤", "تاريخ الميلاد بصيغة YYYY-MM-DD مثال: 2021-09-14."],
    ["٥", "الجنس: ذكر أو أنثى فقط."],
    ["٦", "المرحلة والفصل يجب أن تطابق المسميات في النظام (انظر القائمتين أدناه)."],
    ["٧", "يصدر النظام الرقم الأكاديمي تلقائيًا لكل طالب بعد الاعتماد."],
    ["", ""],
    ["المراحل المتاحة", stages.map((s) => s.name_ar).join(" · ") || "—"],
    ["الفصول المتاحة", classrooms.map((c) => c.name_ar).join(" · ") || "—"],
  ];
  lines.forEach(([a, b], i) => {
    const row = guide.getRow(i + 1);
    row.getCell(1).value = a;
    row.getCell(2).value = b;
    row.getCell(1).font = { name: "Cairo", size: 11, bold: true, color: { argb: BURGUNDY } };
    row.getCell(2).font = { name: "Cairo", size: 11 };
    row.getCell(2).alignment = { wrapText: true, horizontal: "right", vertical: "middle" };
    row.height = 24;
  });

  const buffer = await wb.xlsx.writeBuffer();
  download(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `نموذج-استيراد-الطلاب-${academicYear}.xlsx`,
  );
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const rich = value as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (typeof rich.text === "string") return rich.text;
    if (rich.richText) return rich.richText.map((t) => t.text).join("");
    if (rich.result !== undefined) return cellText(rich.result);
    return "";
  }
  return String(value);
}

/** Reads a filled template (or any sheet with matching headers) into rows. */
export async function parseImportFile(file: File): Promise<SheetRow[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("الملف لا يحتوي على أي ورقة بيانات.");

  // Find the header row by matching known labels.
  let headerRow = 0;
  const labels = new Set(IMPORT_COLUMNS.map((c) => norm(c.label)));
  for (let r = 1; r <= Math.min(sheet.rowCount, 12); r += 1) {
    const values = (sheet.getRow(r).values as unknown[]) ?? [];
    const hits = values.filter((v) => labels.has(norm(cellText(v).replace("*", "")))).length;
    if (hits >= 3) {
      headerRow = r;
      break;
    }
  }
  if (!headerRow) throw new Error("لم يتم العثور على صف العناوين — استخدم النموذج الرسمي.");

  const map = new Map<number, string>();
  (sheet.getRow(headerRow).values as unknown[]).forEach((v, i) => {
    const label = norm(cellText(v).replace("*", ""));
    const col = IMPORT_COLUMNS.find((c) => norm(c.label) === label);
    if (col) map.set(i, col.key);
  });

  const rows: SheetRow[] = [];
  for (let r = headerRow + 1; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const entry: SheetRow = {};
    let filled = false;
    map.forEach((key, col) => {
      const text = cellText(row.getCell(col).value).trim();
      entry[key] = text;
      if (text) filled = true;
    });
    // Skip the hint row and blank rows.
    if (!filled) continue;
    if (IMPORT_COLUMNS.some((c) => c.hint && entry[c.key] === c.hint)) continue;
    rows.push(entry);
  }
  return rows;
}
