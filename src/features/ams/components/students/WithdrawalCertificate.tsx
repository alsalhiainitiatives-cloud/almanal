/**
 * Official printable "duration of enrolment" certificate for a withdrawn or
 * graduated student. Rendered as an isolated A4 HTML document (never inherits
 * app CSS) so it prints identically from any screen.
 */
import type { WithdrawalCertificate } from "../../withdrawals.server";
import { WITHDRAWAL_KINDS, WITHDRAWAL_REASONS, durationLabel, formatDate, money } from "../../withdrawals";

const esc = (v: unknown) => String(v ?? "—").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const CSS = `
  @page{size:A4 portrait;margin:0}
  *{box-sizing:border-box}
  body{font-family:"Cairo","Segoe UI",sans-serif;margin:0;padding:18px;color:#30272a;background:#e8e8ea;direction:rtl}
  .page{width:210mm;min-height:297mm;margin:0 auto 18px;background:#fff;position:relative;overflow:hidden;padding:25mm 20mm 22mm;break-after:page;page-break-after:always;box-shadow:0 8px 28px rgba(35,22,27,.12)}
  .page:last-child{break-after:auto;page-break-after:auto}
  .page::before{content:"";position:absolute;inset:9mm;border:1px solid #d9c5cd;pointer-events:none}
  .page::after{content:"";position:absolute;top:9mm;right:9mm;width:45mm;height:4px;background:#7A1F3D;box-shadow:-45mm 0 0 #C9A227;pointer-events:none}
  .watermark{position:absolute;inset:0;display:grid;place-items:center;font-size:66px;font-weight:900;color:rgba(122,31,61,.035);transform:rotate(-24deg);pointer-events:none}
  .page-header{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #ddced4;padding-bottom:10px}
  .brand{font-size:16px;font-weight:900;color:#7A1F3D}.brand small{display:block;margin-top:3px;font-size:9px;color:#87757c;font-weight:700}
  .document-id{text-align:left;font-size:9px;line-height:1.8;color:#806d74}.document-id b{display:block;color:#7A1F3D;font-size:11px}
  .page-title{position:relative;margin:14mm 0 8mm;text-align:center}.page-title span{display:inline-block;color:#C9A227;font-size:10px;font-weight:900}.page-title h2{margin:4px 0 0;color:#7A1F3D;font-size:24px}.page-title p{margin:5px 0 0;color:#77666c;font-size:10px}
  .cover{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding-top:34mm}
  .seal{display:grid;width:42mm;height:42mm;place-items:center;border:2px solid #C9A227;border-radius:50%;box-shadow:inset 0 0 0 4px #fff,inset 0 0 0 6px #7A1F3D;color:#7A1F3D;font-size:22px;font-weight:900;overflow:hidden}.seal img{width:78%;height:78%;object-fit:contain}
  .cover h1{margin:15mm 0 3mm;color:#7A1F3D;font-size:29px}.cover .student{font-size:26px;font-weight:900;color:#30272a}.cover .subtitle{margin-top:4mm;color:#7c696f;font-size:12px}
  .cover-meta{margin-top:18mm;display:grid;width:100%;grid-template-columns:repeat(3,1fr);gap:8px}.cover-meta div{border-top:2px solid #C9A227;padding-top:8px;font-size:10px;color:#7c696f}.cover-meta b{display:block;margin-top:3px;color:#30272a;font-size:12px}
  table{position:relative;width:100%;border-collapse:collapse;font-size:12px}.info-table tr:nth-child(odd){background:#fbf7f8}.info-table td{padding:11px 12px;border-bottom:1px solid #eadfe3}.info-table td.k{width:32%;color:#806e74;font-weight:700}.info-table td.v{font-weight:900;color:#30272a}
  .grid{position:relative;display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.stat{border:1px solid #e2d4d9;border-top:4px solid #7A1F3D;padding:18px;text-align:center;background:#fcf9fa}.stat b{display:block;font-size:26px;color:#7A1F3D}.stat span{font-size:10px;color:#79676e;font-weight:800}
  .finance{position:relative;margin-top:18px;border:1px solid #ead9c0;border-right:5px solid #C9A227;background:#fffbf4;padding:16px;font-size:12px;line-height:2}.finance b{color:#7A1F3D}
  .subject{position:relative;border:1px solid #e2d4d9;padding:14px;margin-top:12px;break-inside:avoid}.subject h3{margin:0 0 8px;padding-bottom:7px;border-bottom:1px solid #eadfe3;font-size:13px;color:#7A1F3D}.topic{font-size:11px;color:#524449;line-height:2}.topic b{color:#30272a}.chip{display:inline-block;border-radius:4px;padding:2px 7px;font-size:9px;font-weight:800;margin:2px}.done{background:#e7f4ed;color:#176942}.todo{background:#f0edef;color:#8a7a80}
  .statement{position:relative;margin-top:16mm;border:1px solid #dfced5;border-right:6px solid #7A1F3D;padding:22px;font-size:14px;line-height:2.5;text-align:justify;background:#fdfafb}.statement b{color:#7A1F3D}
  .sign{position:relative;margin-top:28mm;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.box{padding:12px 8px 8px;border-top:1px solid #9f8d94;font-size:10px;color:#746269;font-weight:800;text-align:center}
  .note{position:relative;margin-top:18mm;border-top:1px solid #e2d6da;padding-top:12px;font-size:9px;color:#8a787e;line-height:2}
  .page-number{position:absolute;bottom:13mm;left:0;right:0;text-align:center;color:#9a878e;font-size:8px;font-weight:700}
  @media print{body{padding:0;background:#fff}.page{margin:0;box-shadow:none;width:210mm;height:297mm;min-height:297mm}}
`;

export function certificateHtml(data: WithdrawalCertificate, logoUrl?: string | null) {
  const { record, student, attendance, finance, curriculum } = data;
  const kind = WITHDRAWAL_KINDS[record.kind as keyof typeof WITHDRAWAL_KINDS] ?? record.kind;
  const reason = WITHDRAWAL_REASONS[record.reason as keyof typeof WITHDRAWAL_REASONS] ?? record.reason;
  const from = record.enrolled_from;
  const to = record.effective_date;

  const info: [string, string][] = [
    ["اسم الطالب/ة", esc(student.name_ar)],
    ["الاسم بالإنجليزية", esc(student.name_en)],
    ["رقم الهوية", esc(student.national_id)],
    ["الرقم الأكاديمي", esc(student.studentNumber)],
    ["تاريخ الميلاد", esc(formatDate(student.birth_date))],
    ["الجنسية", esc(student.nationality)],
    ["المرحلة", esc(student.stage)],
    ["الفصل", esc(student.classroom)],
    ["العام الدراسي", esc(student.academicYear)],
    ["ولي الأمر", esc(student.parentName)],
  ];

  const enrolment: [string, string][] = [
    ["تاريخ الالتحاق", esc(formatDate(from))],
    [kind === "تخرّج" ? "تاريخ التخرّج" : "تاريخ الانسحاب", esc(formatDate(to))],
    ["مدة الالتحاق", esc(durationLabel(from, to))],
    ["نوع الإجراء", esc(kind)],
    ["السبب", esc(reason)],
    ["الجهة المنقول إليها", esc(record.destination_school)],
    ["الوضع المالي", record.finance_cleared ? "مُسوّى بالكامل" : `متبقٍ ${esc(money(finance.outstanding))}`],
  ];

  const rows = (list: [string, string][]) =>
    `<table class="info-table">${list.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`).join("")}</table>`;

  const curriculumHtml = curriculum.length
    ? curriculum
        .map(
          (s) => `<div class="subject"><h3>${esc(s.subject)}</h3>${
            s.topics.length
              ? s.topics
                  .map(
                    (t) =>
                      `<div class="topic"><b>${esc(t.topic)}:</b> ${
                        t.lessons.length
                          ? t.lessons
                              .map(
                                (l) =>
                                  `<span class="chip ${l.studied ? "done" : "todo"}">${esc(l.name)}</span>`,
                              )
                              .join("")
                          : "—"
                      }</div>`,
                  )
                  .join("")
              : '<div class="topic">—</div>'
          }</div>`,
        )
        .join("")
    : '<div class="subject"><div class="topic">لا توجد مواد مرصودة لهذا الفصل.</div></div>';

  const pronoun = student.gender === "female" ? "الطالبة" : "الطالب";

  const issuedAt = formatDate(record.certificate_issued_at ?? new Date().toISOString());
  const documentId = esc(record.certificate_number ?? "غير مُصدَرة");
  const header = (page: number, title: string, description: string) => `<div class="watermark">روضة ومدارس المنال</div>
    <header class="page-header"><div class="brand">روضة ومدارس المنال<small>عنيزة — المملكة العربية السعودية</small></div><div class="document-id"><b>${documentId}</b>تاريخ الإصدار: ${esc(issuedAt)}</div></header>
    <div class="page-title"><span>وثيقة رسمية</span><h2>${title}</h2><p>${description}</p></div><div class="page-number">الصفحة ${page} من 5</div>`;

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
  <title>شهادة ${esc(kind)} — ${esc(student.name_ar)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" rel="stylesheet" />
  <style>${CSS}</style></head><body>
  <section class="page cover">
    <div class="watermark">روضة ومدارس المنال</div><div class="seal">${logoUrl ? `<img src="${esc(logoUrl)}" alt="شعار روضة ومدارس المنال" />` : "المنال"}</div>
    <h1>وثيقة ${esc(kind)} وبيان مدة الالتحاق</h1><div class="student">${esc(student.name_ar)}</div>
    <div class="subtitle">وثيقة مدرسية رسمية تشمل بيانات الطالب ومدة الالتحاق والحضور والمواد المدروسة</div>
    <div class="cover-meta"><div>رقم الوثيقة<b>${documentId}</b></div><div>العام الدراسي<b>${esc(student.academicYear)}</b></div><div>تاريخ الإصدار<b>${esc(issuedAt)}</b></div></div>
    <div class="page-number">الصفحة 1 من 5</div>
  </section>

  <section class="page">${header(2, `بيانات ${esc(pronoun)}`, "البيانات الشخصية والدراسية وبيانات ولي الأمر")}${rows(info)}</section>

  <section class="page">${header(3, "مدة الالتحاق والحضور", "تفاصيل الإجراء وملخص انتظام الطالب خلال فترة التحاقه")}
    ${rows(enrolment)}
    <div class="grid" style="margin-top:10mm"><div class="stat"><b>${attendance.total}</b><span>أيام مرصودة</span></div><div class="stat"><b>${attendance.present}</b><span>حضور</span></div><div class="stat"><b>${attendance.absent}</b><span>غياب</span></div><div class="stat"><b>${attendance.late + attendance.excused}</b><span>تأخير / بعذر</span></div></div>
    <div class="finance"><b>الوضع المالي:</b> ${record.finance_cleared ? "تمت تسوية الالتزامات المالية بالكامل." : `يوجد مبلغ متبقٍ قدره ${esc(money(finance.outstanding))}.`}</div>
  </section>

  <section class="page">${header(4, "المواد والموضوعات المدروسة", "ملخص المنهج والدروس المرصودة خلال فترة الالتحاق")}${curriculumHtml}
    <div class="note">الدروس المميزة باللون الأخضر هي الدروس التي رُصد لها تقييم فعلي للطالب/ة خلال فترة الالتحاق.</div>
  </section>

  <section class="page">${header(5, "الإفادة والاعتماد", "الصيغة الرسمية للوثيقة ومساحات التوقيع والختم")}
    <div class="statement">
      تشهد إدارة روضة ومدارس المنال بأن ${esc(pronoun)} <b>${esc(student.name_ar)}</b>
      كان/ت منتظمًا/ة بالمرحلة <b>${esc(student.stage)}</b>${
        student.classroom ? ` — فصل <b>${esc(student.classroom)}</b>` : ""
      }
      خلال العام الدراسي <b>${esc(student.academicYear)}</b>، ومدة التحاقه/ا بالمنشأة
      <b>${esc(durationLabel(from, to))}</b> من ${esc(formatDate(from))} إلى ${esc(formatDate(to))}،
      وقد تم ${esc(kind)} بناءً على ${esc(reason)}${
        record.destination_school ? ` بغرض الانتقال إلى ${esc(record.destination_school)}` : ""
      }،
      ${
        record.finance_cleared
          ? "ولا توجد عليه/ا أي التزامات مالية تجاه المنشأة."
          : `مع بقاء التزام مالي بمبلغ ${esc(money(finance.outstanding))}.`
      }
      وقد أُعطيت له/ا هذه الشهادة بناءً على طلبه/ا دون أي مسؤولية على المنشأة.
    </div>
    <div class="sign"><div class="box">مديرة الروضة / المدرسة<br />الاسم والتوقيع</div><div class="box">شؤون الطلاب<br />الاسم والتوقيع</div><div class="box">الختم الرسمي</div></div>
    <div class="note">هذه الوثيقة صادرة إلكترونيًا من نظام إدارة روضة ومدارس المنال، ولا تُعد صحيحة دون التوقيع والختم الرسمي.</div>
  </section></body></html>`;
}

/**
 * Prints the certificate from a hidden A4 iframe — never needs a popup window,
 * so browser popup blockers can't break printing.
 */
export async function printCertificate(data: WithdrawalCertificate, logoUrl?: string | null) {
  if (typeof document === "undefined") return false;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;inset:0;width:210mm;height:297mm;opacity:0;pointer-events:none;border:0;";
  document.body.appendChild(frame);

  await new Promise<void>((resolve) => {
    frame.addEventListener("load", () => resolve(), { once: true });
    frame.srcdoc = certificateHtml(data, logoUrl);
  });

  const win = frame.contentWindow;
  try {
    await (win?.document as (Document & { fonts?: FontFaceSet }) | undefined)?.fonts?.ready;
  } catch {
    /* fonts API unavailable */
  }
  await new Promise((r) => setTimeout(r, 400));

  win?.focus();
  win?.print();
  setTimeout(() => frame.remove(), 60_000);
  return true;
}
