/**
 * Official printable payment voucher / receipt.
 *
 * Renders an isolated print document (logo, association, school, bank details
 * and installment data) in a new window so printing never inherits app styles.
 */
import { dateAr, money, type BankAccountRow } from "../pricing";

export type VoucherInput = {
  bank: BankAccountRow | null | undefined;
  applicationNumber?: string | null;
  parentName?: string | null;
  childName?: string | null;
  seq?: number | null;
  amount: number;
  dueDate?: string | null;
  academicYear?: string | null;
  paid?: boolean;
  reference?: string | null;
};

const esc = (v: unknown) =>
  String(v ?? "—").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function voucherHtml(input: VoucherInput) {
  const bank = input.bank;
  const title = input.paid ? "إيصال سداد" : "نموذج سداد رسوم";
  const rows: [string, string][] = [
    ["الرقم الأكاديمي", esc(input.applicationNumber)],
    ["ولي الأمر", esc(input.parentName)],
    ["الطالب/ة", esc(input.childName)],
    ["العام الدراسي", esc(input.academicYear)],
    ["رقم الدفعة", input.seq ? esc(input.seq) : "—"],
    ["تاريخ الاستحقاق", input.dueDate ? esc(dateAr(input.dueDate)) : "—"],
    ["المرجع", esc(input.reference)],
  ];
  const bankRows: [string, string][] = bank
    ? [
        ["اسم صاحب الحساب", esc(bank.account_holder)],
        ["البنك", esc(bank.bank_name)],
        ["رقم الحساب", esc(bank.account_number)],
        ["الآيبان", esc(bank.iban)],
      ]
    : [];

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:"Cairo","Segoe UI",sans-serif;margin:0;padding:32px;color:#2b2b2b;background:#fff}
  .sheet{max-width:720px;margin:auto;border:2px solid #7A1F3D;border-radius:20px;padding:28px}
  header{display:flex;align-items:center;gap:16px;border-bottom:2px dashed #e0cdd5;padding-bottom:16px}
  header img{width:64px;height:64px;object-fit:contain;border-radius:14px}
  h1{font-size:19px;margin:0;color:#7A1F3D}
  h2{font-size:13px;margin:4px 0 0;color:#666;font-weight:600}
  .badge{margin-inline-start:auto;background:#7A1F3D;color:#fff;border-radius:999px;padding:8px 16px;font-size:12px;font-weight:800}
  table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
  td{padding:9px 6px;border-bottom:1px solid #efe6ea}
  td:first-child{color:#777;width:38%}
  td:last-child{font-weight:800}
  .total{margin-top:18px;background:#fdf4f7;border-radius:16px;padding:16px;display:flex;justify-content:space-between;align-items:center}
  .total span:last-child{color:#7A1F3D;font-size:22px;font-weight:900}
  .note{margin-top:16px;font-size:11px;color:#777;line-height:1.9}
  .sign{margin-top:28px;display:flex;justify-content:space-between;font-size:12px;color:#555}
  @media print{body{padding:0}.sheet{border:none}}
</style></head><body onload="window.print()">
<div class="sheet">
  <header>
    ${bank?.logo_url ? `<img src="${esc(bank.logo_url)}" alt="الشعار" />` : ""}
    <div>
      <h1>${esc(bank?.school_name_ar ?? "روضة ومدارس المنال")}</h1>
      <h2>${esc(bank?.org_name_ar ?? "")}</h2>
    </div>
    <div class="badge">${title}</div>
  </header>

  <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>

  <div class="total"><span>المبلغ ${input.paid ? "المسدَّد" : "المستحق"}</span><span>${esc(
    money(input.amount),
  )}</span></div>

  ${
    bankRows.length
      ? `<table>${bankRows
          .map(([k, v]) => `<tr><td>${k}</td><td dir="ltr">${v}</td></tr>`)
          .join("")}</table>`
      : ""
  }

  <p class="note">${esc(bank?.notes_ar ?? "")}<br/>يرجى الاحتفاظ بإيصال التحويل ورفعه في بوابة ولي الأمر لاعتماد السداد من قسم الحسابات.</p>

  <div class="sign"><span>ختم الإدارة المالية</span><span>التاريخ: ${esc(
    dateAr(new Date().toISOString()),
  )}</span></div>
</div>
</body></html>`;
}

export function printVoucher(input: VoucherInput) {
  const win = window.open("", "_blank", "noopener,width=860,height=1000");
  if (!win) return;
  win.document.write(voucherHtml(input));
  win.document.close();
}
