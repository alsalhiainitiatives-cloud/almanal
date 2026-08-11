/**
 * Official printable finance documents.
 *
 * Two flavours share one A4-styled isolated HTML document (never inherits app CSS):
 *  - "voucher": نموذج سداد رسوم — issued before payment, carries bank transfer data.
 *  - "receipt": سند استلام مبلغ — issued after finance approves the payment, acts as
 *    an official proof of payment for the parent (printable / saveable as PDF).
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
  /** Payment date (for official receipts). */
  paidAt?: string | null;
  /** Serial of the official receipt. */
  receiptNo?: string | null;
  /** Total invoice value + already collected, to print a running balance. */
  invoiceTotal?: number | null;
  invoicePaidTotal?: number | null;
};

const esc = (v: unknown) =>
  String(v ?? "—").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const SHELL_CSS = `
  *{box-sizing:border-box}
  body{font-family:"Cairo","Segoe UI",sans-serif;margin:0;padding:28px;color:#2b2b2b;background:#f6f2f4}
  .sheet{max-width:760px;margin:auto;background:#fff;border:2px solid #7A1F3D;border-radius:20px;padding:28px;position:relative;overflow:hidden}
  .watermark{position:absolute;inset:0;display:grid;place-items:center;font-size:88px;font-weight:900;color:rgba(122,31,61,.05);transform:rotate(-18deg);pointer-events:none;letter-spacing:4px}
  header{display:flex;align-items:center;gap:16px;border-bottom:2px dashed #e0cdd5;padding-bottom:16px;position:relative}
  header img{width:66px;height:66px;object-fit:contain;border-radius:14px}
  h1{font-size:19px;margin:0;color:#7A1F3D}
  h2{font-size:13px;margin:4px 0 0;color:#666;font-weight:600}
  .badge{margin-inline-start:auto;background:#7A1F3D;color:#fff;border-radius:999px;padding:9px 16px;font-size:12px;font-weight:800;text-align:center}
  .badge small{display:block;font-size:10px;font-weight:700;opacity:.85;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
  .section-title{margin:22px 0 -6px;font-size:12px;font-weight:900;color:#7A1F3D}
  td{padding:9px 6px;border-bottom:1px solid #efe6ea}
  td:first-child{color:#777;width:38%}
  td:last-child{font-weight:800}
  .total{margin-top:18px;background:#fdf4f7;border:1px solid #f0dbe3;border-radius:16px;padding:16px;display:flex;justify-content:space-between;align-items:center}
  .total span:last-child{color:#7A1F3D;font-size:22px;font-weight:900}
  .stamp{margin-top:22px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .stamp .box{border:2px dashed #cbb3bd;border-radius:16px;padding:14px 18px;font-size:11px;color:#8a7a80;font-weight:800;text-align:center;min-width:180px}
  .paid-mark{border:3px solid #1F8A5B;color:#1F8A5B;border-radius:14px;padding:10px 18px;font-size:15px;font-weight:900;transform:rotate(-6deg)}
  .note{margin-top:16px;font-size:11px;color:#777;line-height:1.9}
  .sign{margin-top:24px;display:flex;justify-content:space-between;font-size:12px;color:#555}
  @media print{body{padding:0;background:#fff}.sheet{border:none;border-radius:0}}
`;

function rowsHtml(rows: [string, string][], ltrValues = false) {
  return `<table>${rows
    .map(
      ([k, v]) => `<tr><td>${k}</td><td${ltrValues ? ' dir="ltr"' : ""}>${v}</td></tr>`,
    )
    .join("")}</table>`;
}

export function voucherHtml(input: VoucherInput) {
  const bank = input.bank;
  const isReceipt = Boolean(input.paid);
  const title = isReceipt ? "سند استلام مبلغ" : "نموذج سداد رسوم";
  const remaining =
    input.invoiceTotal != null && input.invoicePaidTotal != null
      ? Number(input.invoiceTotal) - Number(input.invoicePaidTotal)
      : null;

  const info: [string, string][] = [
    ["الرقم الأكاديمي / رقم الطلب", esc(input.applicationNumber)],
    ["ولي الأمر", esc(input.parentName)],
    ["الطالب/ة", esc(input.childName)],
    ["العام الدراسي", esc(input.academicYear)],
    ["رقم الدفعة", input.seq ? esc(input.seq) : "—"],
    [
      isReceipt ? "تاريخ السداد" : "تاريخ الاستحقاق",
      isReceipt
        ? esc(dateAr(input.paidAt ?? new Date().toISOString()))
        : input.dueDate
          ? esc(dateAr(input.dueDate))
          : "—",
    ],
    ["المرجع", esc(input.reference)],
  ];
  if (isReceipt && remaining != null) {
    info.push(["إجمالي الفاتورة", esc(money(Number(input.invoiceTotal)))]);
    info.push(["المتبقي بعد هذه الدفعة", esc(money(Math.max(remaining, 0)))]);
  }

  const bankRows: [string, string][] = bank
    ? [
        ["اسم صاحب الحساب", esc(bank.account_holder)],
        ["البنك", esc(bank.bank_name)],
        ["رقم الحساب", esc(bank.account_number)],
        ["الآيبان", esc(bank.iban)],
      ]
    : [];

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>${title}${input.applicationNumber ? ` - ${esc(input.applicationNumber)}` : ""}</title>
<style>${SHELL_CSS}</style></head><body>
<div class="sheet">
  ${isReceipt ? `<div class="watermark">مسدَّد</div>` : ""}
  <header>
    ${bank?.logo_url ? `<img src="${esc(bank.logo_url)}" alt="الشعار" />` : ""}
    <div>
      <h1>${esc(bank?.school_name_ar ?? "روضة ومدارس المنال")}</h1>
      <h2>${esc(bank?.org_name_ar ?? "")}</h2>
    </div>
    <div class="badge">${title}${
      isReceipt ? `<small>رقم السند: ${esc(input.receiptNo)}</small>` : ""
    }</div>
  </header>

  <p class="section-title">بيانات الطلب والدفعة</p>
  ${rowsHtml(info)}

  <div class="total"><span>المبلغ ${isReceipt ? "المسدَّد" : "المستحق"}</span><span>${esc(
    money(input.amount),
  )}</span></div>

  ${
    bankRows.length && !isReceipt
      ? `<p class="section-title">بيانات التحويل البنكي</p>${rowsHtml(bankRows, true)}`
      : ""
  }

  <div class="stamp">
    <div class="box">ختم الإدارة المالية<br/>${esc(bank?.school_name_ar ?? "روضة ومدارس المنال")}</div>
    ${isReceipt ? `<div class="paid-mark">تم استلام المبلغ</div>` : ""}
    <div class="box">توقيع المحاسب</div>
  </div>

  <p class="note">${esc(bank?.notes_ar ?? "")}<br/>${
    isReceipt
      ? "هذا السند إثبات رسمي باستلام المبلغ المذكور أعلاه بعد اعتماده من الإدارة المالية. يُرجى الاحتفاظ به للمراجعة."
      : "يرجى الاحتفاظ بإيصال التحويل ورفعه في بوابة ولي الأمر لاعتماد السداد من قسم الحسابات."
  }</p>

  <div class="sign"><span>${esc(bank?.org_name_ar ?? "")}</span><span>تاريخ الإصدار: ${esc(
    dateAr(new Date().toISOString()),
  )}</span></div>
</div>
</body></html>`;
}

/** Opens the document in a new window and triggers the print dialog. */
export function printVoucher(input: VoucherInput) {
  const win = window.open("", "_blank", "noopener,width=880,height=1040");
  if (!win) return;
  win.document.write(`${voucherHtml(input)}<script>window.onload=()=>window.print()<\/script>`);
  win.document.close();
}
