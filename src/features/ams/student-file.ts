/**
 * Shared, client-safe types + PDF engine for the official student file.
 *
 * The PDF is produced from a purpose-built, print-only HTML document rendered
 * in a hidden A4 iframe — real selectable text and vector rules, not a
 * screenshot of the screen UI.
 */

export type StudentFileData = {
  student: {
    id: string;
    name_ar: string;
    name_en: string | null;
    national_id: string | null;
    gender: string | null;
    birth_date: string | null;
    nationality: string | null;
    birth_place: string | null;
    photo_url: string | null;
    /** Signed URL of the photo uploaded within the admission documents (fallback). */
    photo_signed_url?: string | null;
    blood_type: string | null;
    medical_conditions: string | null;
    allergies: string | null;
    special_needs: string | null;
    previous_school: string | null;
    last_grade: string | null;
    vaccination_status: string | null;
    created_at: string | null;
  };
  application: {
    id: string;
    applicationNumber: string | null;
    studentNumber: string | null;
    status: string;
    academicYear: string;
    relationship: string | null;
    submittedAt: string | null;
    decidedAt: string | null;
  };
  parent: {
    name: string;
    phone: string | null;
    email: string | null;
    nationalId: string | null;
    nationality: string | null;
    city: string | null;
    district: string | null;
    job: string | null;
  };
  stage: {
    id: string;
    name_ar: string;
    age_label: string | null;
    operating_hours: string | null;
    min_age_months?: number | null;
    max_age_months?: number | null;
  } | null;
  classroom: {
    id: string;
    name_ar: string;
    teacher_name: string | null;
    teacher_title: string | null;
    schedule_ar: string | null;
  } | null;
  qurra: { status: string; requested: boolean | null } | null;
  services: { name: string; price: number }[];
  invoice: {
    status: string;
    grand_total: number | string;
    paid_total: number | string;
    plan_type: string | null;
    installments_count: number | null;
  } | null;
};

export const GENDER_LABELS: Record<string, string> = { male: "ذكر", female: "أنثى" };

/** Vaccination status is stored in English — always render the Arabic label. */
export const VACCINATION_FILE_LABELS: Record<string, string> = {
  complete: "مكتملة",
  partial: "غير مكتملة",
  none: "لا يوجد",
};

export function vaccinationLabel(value?: string | null) {
  if (!value) return null;
  return VACCINATION_FILE_LABELS[value] ?? value;
}

const yearsWord = (n: number) => (n === 1 ? "سنة" : n === 2 ? "سنتان" : n <= 10 ? "سنوات" : "سنة");

/** Auto-derived age band for the stage (e.g. "من 3 إلى 4 سنوات"). */
export function ageBandLabel(stage: StudentFileData["stage"]): string | null {
  const min = stage?.min_age_months;
  const max = stage?.max_age_months;
  if (min === null || min === undefined || max === null || max === undefined) return stage?.age_label ?? null;
  const toLabel = (m: number) => {
    const y = Math.floor(m / 12);
    const r = m % 12;
    if (y === 0) return `${m} شهرًا`;
    return r === 0 ? `${y} ${yearsWord(y)}` : `${y} ${yearsWord(y)} و ${r} شهرًا`;
  };
  return `من ${toLabel(min)} إلى ${toLabel(max)}`;
}

/** The single official identifier of an enrolled student. */
export function studentIdentifier(
  application: StudentFileData["application"],
  applicationCode: string,
): string {
  return application.studentNumber?.trim() || applicationCode;
}

export const QURRA_LABELS: Record<string, string> = {
  eligible: "مستحق مبدئيًا",
  waiting_school_review: "بانتظار مراجعة المدرسة",
  submitted_to_qurra: "مرفوع لمنصة قرة",
  waiting_response: "بانتظار رد قرة",
  approved: "معتمد من قرة",
  rejected: "غير معتمد",
  not_requested: "غير مطلوب",
};

export function formatFileDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function esc(value: unknown) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Pair = [string, unknown];

function fieldsHtml(pairs: Pair[]) {
  return pairs
    .map(
      ([label, value]) => `
      <div class="f">
        <span class="fl">${esc(label)}</span>
        <span class="fv">${esc(value)}</span>
      </div>`,
    )
    .join("");
}

function sectionHtml(title: string, pairs: Pair[]) {
  return `
  <section class="sec">
    <h2>${esc(title)}</h2>
    <div class="grid">${fieldsHtml(pairs)}</div>
  </section>`;
}

export function buildStudentFileHtml(
  data: StudentFileData,
  opts: {
    schoolName: string;
    organization: string;
    addressLine: string;
    phone: string;
    applicationCode: string;
    ageLabel: string | null;
    logoUrl?: string | null;
    photoUrl?: string | null;
  },
) {
  const { student, application, parent, stage, classroom, qurra, services, invoice } = data;
  const money = (v: number | string) => Number(v || 0).toLocaleString("ar-SA");

  const photoBlock = opts.photoUrl
    ? `<img class="photo" src="${esc(opts.photoUrl)}" alt="صورة الطالب" />`
    : `<div class="photo empty">${esc(student.name_ar.trim().charAt(0))}</div>`;

  return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>ملف الطالب — ${esc(student.name_ar)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 10mm 11mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
    color: #1c1c1c;
    font-size: 9.4pt;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { width: 100%; }
  header.top {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 10mm;
    border-bottom: 2pt solid #7A1F3D; padding-bottom: 4mm;
  }
  .ident { display: flex; gap: 4mm; align-items: flex-start; }
  .logo { width: 20mm; height: 20mm; object-fit: contain; }
  .org { font-size: 8.6pt; color: #6b6b6b; font-weight: 600; margin: 0; }
  h1 { font-size: 15pt; color: #7A1F3D; margin: 1mm 0; font-weight: 900; }
  .addr { font-size: 8.4pt; color: #6b6b6b; margin: 0; }
  .badge {
    display: inline-block; margin-top: 2mm; padding: 1mm 3mm; border-radius: 20pt;
    background: #f7e9ee; color: #7A1F3D; font-size: 8.4pt; font-weight: 900;
  }
  .photo-wrap { text-align: center; }
  .photo {
    width: 26mm; height: 32mm; object-fit: cover; border: 1.2pt solid #B64A6A;
    border-radius: 3mm; display: block;
  }
  .photo.empty {
    display: flex; align-items: center; justify-content: center;
    background: #f4f0ec; color: #b08a99; font-size: 18pt; font-weight: 900;
  }
  .cap { font-size: 7.4pt; color: #7a7a7a; margin-top: 1mm; }
  .sec { margin-top: 2.3mm; break-inside: avoid; }
  .sec h2 {
    font-size: 10.4pt; color: #7A1F3D; font-weight: 900; margin: 0 0 2mm;
    border-bottom: 0.8pt solid #e2c9d3; padding-bottom: 1mm;
  }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
  .grid.head { margin-top: 3.4mm; }
  .f {
    border: 0.6pt solid #ddd6d0; border-radius: 2mm; padding: 1.1mm 2mm;
    break-inside: avoid; background: #fdfcfb;
  }
  .fl { display: block; font-size: 7.6pt; color: #7a7a7a; font-weight: 700; }
  .fv { display: block; font-size: 9pt; color: #1c1c1c; font-weight: 700; margin-top: 0.6mm; }
  .signs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; margin-top: 4mm; border-top: 0.8pt solid #ddd6d0; padding-top: 4mm; break-inside: avoid; }
  .sign { text-align: center; }
  .sign p { margin: 0; font-size: 9pt; font-weight: 900; }
  .line { margin: 4mm auto 1mm; width: 80%; border-top: 0.8pt dashed #9a9a9a; }
  .sign small { font-size: 7.2pt; color: #7a7a7a; }
  .foot { margin-top: 2mm; text-align: center; font-size: 7.4pt; color: #8a8a8a; }
  .ltr { direction: ltr; unicode-bidi: embed; }
</style>
</head>
<body>
  <div class="doc">
    <header class="top">
      <div class="ident">
        ${opts.logoUrl ? `<img class="logo" src="${esc(opts.logoUrl)}" alt="" />` : ""}
        <div>
          <p class="org">${esc(opts.organization)}</p>
          <h1>${esc(opts.schoolName)}</h1>
          <p class="addr">${esc(opts.addressLine)} · هاتف <span class="ltr">${esc(opts.phone)}</span></p>
          <span class="badge">ملف الطالب الرسمي · العام الدراسي ${esc(application.academicYear)}</span>
        </div>
      </div>
      <div class="photo-wrap">
        ${photoBlock}
        <p class="cap">صورة الطالب</p>
      </div>
    </header>

    ${sectionHtml("بيانات الطالب", [
      ["اسم الطالب", student.name_ar],
      ["الرقم الأكاديمي", studentIdentifier(application, opts.applicationCode)],
      ["الاسم بالإنجليزية", student.name_en],
      ["رقم الهوية / الإقامة", student.national_id],
      ["الجنس", student.gender ? (GENDER_LABELS[student.gender] ?? student.gender) : null],
      ["تاريخ الميلاد", formatFileDate(student.birth_date)],
      ["العمر", opts.ageLabel],
      ["الجنسية", student.nationality],
      ["مكان الميلاد", student.birth_place],
      ["فصيلة الدم", student.blood_type],
      ["حالة التحصينات", vaccinationLabel(student.vaccination_status)],
    ])}

    ${sectionHtml("المرحلة والفصل", [
      ["المرحلة", stage?.name_ar],
      ["الفئة العمرية للمرحلة", ageBandLabel(stage)],
      ["الفصل", classroom?.name_ar],
      ["المعلمة المسؤولة", classroom?.teacher_name],
      ["الدوام", classroom?.schedule_ar ?? stage?.operating_hours],
      ["تاريخ الاعتماد", formatFileDate(application.decidedAt)],
    ])}

    ${sectionHtml("السجل الصحي والتعليمي", [
      ["حالات صحية", student.medical_conditions],
      ["حساسية", student.allergies],
      ["احتياجات خاصة", student.special_needs],
      ["المدرسة/الروضة السابقة", student.previous_school],
      ["آخر صف دراسي", student.last_grade],
      ["تاريخ التسجيل", formatFileDate(student.created_at)],
    ])}

    ${sectionHtml("بيانات ولي الأمر", [
      ["الاسم", parent.name],
      ["صلة القرابة", application.relationship],
      ["رقم الهوية", parent.nationalId],
      ["الجنسية", parent.nationality],
      ["الجوال", parent.phone],
      ["البريد الإلكتروني", parent.email],
      ["المدينة", parent.city],
      ["الحي", parent.district],
      ["جهة العمل", parent.job],
    ])}

    ${sectionHtml("الخدمات والدعم", [
      ["الخدمات المسجّلة", services.length ? services.map((s) => s.name).join(" · ") : "لا يوجد"],
      ["دعم قرة", qurra ? (QURRA_LABELS[qurra.status] ?? qurra.status) : "غير مطلوب"],
      [
        "الحالة المالية",
        invoice ? `${money(invoice.paid_total)} / ${money(invoice.grand_total)} ريال` : "لم تُصدر فاتورة",
      ],
    ])}

    <div class="signs">
      ${["مسؤول التسجيل", "المشرفة التربوية", "مدير المدرسة"]
        .map(
          (role) => `<div class="sign">
            <p>${esc(role)}</p>
            <div class="line"></div>
            <small>الاسم والتوقيع والتاريخ</small>
          </div>`,
        )
        .join("")}
    </div>

    <p class="foot">صدر هذا الملف إلكترونيًا من نظام إدارة القبول — ${esc(opts.schoolName)} · ${esc(
      formatFileDate(new Date().toISOString()),
    )}</p>
  </div>
</body>
</html>`;
}

/**
 * Renders the document in a hidden A4 iframe and opens the browser's
 * "Save as PDF" dialog — produces a text-based, selectable PDF.
 */
export async function downloadStudentFilePdf(html: string) {
  if (typeof document === "undefined") return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;inset:0;width:210mm;height:297mm;opacity:0;pointer-events:none;border:0;";
  document.body.appendChild(frame);

  await new Promise<void>((resolve) => {
    frame.addEventListener("load", () => resolve(), { once: true });
    frame.srcdoc = html;
  });

  // Give webfonts and the photo a moment so the PDF is not missing glyphs/images.
  const win = frame.contentWindow;
  try {
    await (win?.document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    /* fonts API unavailable */
  }
  await new Promise((r) => setTimeout(r, 450));

  win?.focus();
  win?.print();
  setTimeout(() => frame.remove(), 60_000);
}