/**
 * Official printable "duration of enrolment" certificate for a withdrawn or
 * graduated student. Rendered as an isolated A4 HTML document (never inherits
 * app CSS) so it prints identically from any screen.
 */
import type { WithdrawalCertificate } from "../../withdrawals.server";
import { WITHDRAWAL_KINDS, WITHDRAWAL_REASONS, durationLabel, formatDate, money } from "../../withdrawals";

const esc = (v: unknown) => String(v ?? "—").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const CSS = `
  *{box-sizing:border-box}
  body{font-family:"Cairo","Segoe UI",sans-serif;margin:0;padding:26px;color:#2b2b2b;background:#f6f2f4;direction:rtl}
  .sheet{max-width:820px;margin:auto;background:#fff;border:2px solid #7A1F3D;border-radius:20px;padding:30px;position:relative;overflow:hidden}
  .watermark{position:absolute;inset:0;display:grid;place-items:center;font-size:84px;font-weight:900;color:rgba(122,31,61,.05);transform:rotate(-18deg);pointer-events:none;letter-spacing:4px}
  header{display:flex;align-items:flex-start;gap:16px;border-bottom:2px dashed #e0cdd5;padding-bottom:16px}
  h1{font-size:20px;margin:0;color:#7A1F3D}
  h2{font-size:12px;margin:6px 0 0;color:#666;font-weight:600}
  .badge{margin-inline-start:auto;background:#7A1F3D;color:#fff;border-radius:999px;padding:10px 16px;font-size:12px;font-weight:800;text-align:center}
  .badge small{display:block;font-size:10px;font-weight:700;opacity:.85;margin-top:3px}
  .section-title{margin:22px 0 8px;font-size:12px;font-weight:900;color:#7A1F3D;border-inline-start:4px solid #C9A227;padding-inline-start:8px}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  td{padding:8px 6px;border-bottom:1px solid #efe6ea;vertical-align:top}
  td.k{color:#777;width:26%}
  td.v{font-weight:800}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:6px}
  .stat{border:1px solid #f0dbe3;background:#fdf4f7;border-radius:14px;padding:12px;text-align:center}
  .stat b{display:block;font-size:18px;color:#7A1F3D}
  .stat span{font-size:10.5px;color:#7a6b71;font-weight:700}
  .subject{border:1px solid #f0dbe3;border-radius:14px;padding:12px;margin-top:10px}
  .subject h3{margin:0 0 6px;font-size:12.5px;color:#7A1F3D}
  .topic{font-size:11.5px;color:#4b4b4b;line-height:1.9}
  .topic b{color:#2b2b2b}
  .chip{display:inline-block;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:800;margin-inline-end:4px}
  .done{background:#e6f5ee;color:#1F8A5B}
  .todo{background:#f3eef0;color:#8a7a80}
  .statement{margin-top:18px;background:#fdf9f4;border:1px solid #eadfcd;border-radius:16px;padding:16px;font-size:13px;line-height:2.1}
  .sign{margin-top:28px;display:flex;justify-content:space-between;gap:12px}
  .box{border:2px dashed #cbb3bd;border-radius:16px;padding:16px 18px;font-size:11px;color:#8a7a80;font-weight:800;text-align:center;min-width:200px}
  .note{margin-top:14px;font-size:10.5px;color:#8a7a80;line-height:1.9}
  @media print{body{padding:0;background:#fff}.sheet{border:none;border-radius:0}}
`;

export function certificateHtml(data: WithdrawalCertificate) {
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
    `<table>${list.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`).join("")}</table>`;

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

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
  <title>شهادة ${esc(kind)} — ${esc(student.name_ar)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" rel="stylesheet" />
  <style>${CSS}</style></head><body>
  <div class="sheet">
    <div class="watermark">روضة ومدارس المنال</div>
    <header>
      <div>
        <h1>روضة ومدارس المنال — عنيزة</h1>
        <h2>شهادة ${esc(kind)} وبيان مدة الالتحاق والمواد المدروسة</h2>
      </div>
      <div class="badge">${esc(record.certificate_number ?? "غير مُصدَرة")}<small>${esc(
        formatDate(record.certificate_issued_at ?? new Date().toISOString()),
      )}</small></div>
    </header>

    <div class="section-title">بيانات ${esc(pronoun)}</div>
    ${rows(info)}

    <div class="section-title">مدة الالتحاق وبيانات الإجراء</div>
    ${rows(enrolment)}

    <div class="section-title">ملخص الحضور</div>
    <div class="grid">
      <div class="stat"><b>${attendance.total}</b><span>أيام مرصودة</span></div>
      <div class="stat"><b>${attendance.present}</b><span>حضور</span></div>
      <div class="stat"><b>${attendance.absent}</b><span>غياب</span></div>
      <div class="stat"><b>${attendance.late + attendance.excused}</b><span>تأخير / بعذر</span></div>
    </div>

    <div class="section-title">المواد والموضوعات التي دُرست</div>
    ${curriculumHtml}

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

    <div class="sign">
      <div class="box">مدير/ة المنشأة<br /><br />الاسم والتوقيع</div>
      <div class="box">شؤون الطلاب<br /><br />الاسم والتوقيع</div>
      <div class="box">الختم الرسمي</div>
    </div>

    <div class="note">
      • المواد الملوّنة بالأخضر هي الدروس التي رُصد لها تقييم فعلي ${esc(pronoun)} خلال فترة التحاقه/ا.<br />
      • هذه الشهادة صادرة إلكترونيًا من نظام إدارة روضة ومدارس المنال ولا تُعد صحيحة دون الختم الرسمي.
    </div>
  </div></body></html>`;
}

/** Opens the certificate in a new window and triggers the print dialog. */
export function printCertificate(data: WithdrawalCertificate) {
  const win = window.open("", "_blank", "noopener,width=900,height=1040");
  if (!win) return false;
  win.document.write(`${certificateHtml(data)}<script>window.onload=()=>window.print()<\/script>`);
  win.document.close();
  return true;
}
