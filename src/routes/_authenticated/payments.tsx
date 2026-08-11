import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, Eye, FileText, Loader2, Printer, ReceiptText, Search, Sparkles, Upload, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { useAuth } from "@/features/auth/AuthProvider";
import { myFinanceGet, receiptSignedUrl } from "@/features/finance/finance.functions";
import { BankCard } from "@/features/finance/components/BankCard";
import { InvoiceChat } from "@/features/finance/components/InvoiceChat";
import { PlanChooser } from "@/features/finance/components/PlanChooser";
import { ReceiptDialog } from "@/features/finance/components/ReceiptDialog";
import {
  ReceiptPreviewDialog,
  type ReceiptPreview,
} from "@/features/finance/components/ReceiptPreviewDialog";
import { DocumentPreviewDialog } from "@/features/finance/components/DocumentPreviewDialog";
import { ScheduleList, type InstallmentRow } from "@/features/finance/components/ScheduleList";
import { voucherHtml, type VoucherInput } from "@/features/finance/components/PaymentVoucher";
import { RECEIPT_STATUS_LABELS, dateAr, money, type BankAccountRow } from "@/features/finance/pricing";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "المدفوعات والرسوم | مدارس وروضة المنال" },
      {
        name: "description",
        content: "تابع جدول الدفعات، بيانات الحساب البنكي، وارفع إيصالات السداد لطلبات أبنائك.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const load = useServerFn(myFinanceGet);
  const sign = useServerFn(receiptSignedUrl);
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [dialog, setDialog] = useState<{
    invoiceId: string;
    installmentId: string | null;
    amount: number;
  } | null>(null);
  const [doc, setDoc] = useState<{ title: string; html: string; fileName: string } | null>(null);
  const [preview, setPreview] = useState<ReceiptPreview | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["my-finance"], queryFn: () => load() });

  const invoices = data?.invoices ?? [];
  const normalizedSearch = search.trim().toLocaleLowerCase("ar");
  const visibleInvoices = useMemo(
    () =>
      invoices.filter((invoice) => {
        if (!normalizedSearch) return true;
        const app = (invoice as unknown as { applications?: { application_number: string | null } }).applications;
        return `${app?.application_number ?? ""} ${invoice.academic_year}`
          .toLocaleLowerCase("ar")
          .includes(normalizedSearch);
      }),
    [invoices, normalizedSearch],
  );

  async function openPreview(receipt: {
    id: string;
    file_path: string;
    file_name: string | null;
    amount: number | string;
    status: string;
    transfer_date?: string | null;
    created_at: string;
    reference_no?: string | null;
  }) {
    setPreview({
      id: receipt.id,
      url: null,
      fileName: receipt.file_name,
      amount: Number(receipt.amount),
      status: receipt.status,
      date: receipt.transfer_date ?? receipt.created_at,
      reference: receipt.reference_no ?? null,
    });
    const { url } = await sign({ data: { path: receipt.file_path } });
    setPreview((prev) => (prev && prev.id === receipt.id ? { ...prev, url } : prev));
  }

  function openDocument(input: VoucherInput, label: string) {
    setDoc({
      title: label,
      html: voucherHtml(input),
      fileName: `${input.paid ? "receipt" : "voucher"}-${input.applicationNumber ?? "manal"}-${
        input.seq ?? 1
      }`,
    });
  }

  if (isLoading) {
    return (
      <PortalLayout title="المدفوعات والرسوم" description="جدول الدفعات وإيصالات السداد">
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  const bank = (data?.bankAccounts ?? [])[0] as BankAccountRow | undefined;
  const settings = data?.settings;
  const lateAfter = data?.planSettings?.late_after_days ?? 0;
  const pendingPlans = data?.pendingPlans ?? [];

  return (
    <PortalLayout
      title="المدفوعات والرسوم"
      description="جدول الدفعات المستحقة، بيانات التحويل البنكي، ورفع إيصالات السداد"
    >
      {invoices.length === 0 && pendingPlans.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">لا توجد مستحقات مالية حاليًا</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            تظهر الخطة المالية بعد إرسال طلب التسجيل واعتماد الرسوم.
          </p>
          <Button asChild className="mt-5 rounded-2xl">
            <Link to="/my-applications">
              الذهاب إلى طلباتي <ArrowLeft className="size-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {invoices.length > 1 ? (
              <div className="relative">
                <Search className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث بالرقم الأكاديمي أو العام الدراسي"
                  className="h-12 rounded-2xl bg-card pe-11"
                />
              </div>
            ) : null}
            {pendingPlans.map((app) => (
              <PlanChooser
                key={app.id}
                applicationId={app.id}
                applicationNumber={app.application_number}
                qurraMessage={settings?.qurra_message_ar}
                qurraServicesMessage={settings?.qurra_services_message_ar}
                onDone={() => queryClient.invalidateQueries({ queryKey: ["my-finance"] })}
              />
            ))}

            {visibleInvoices.map((invoice) => {
              const rows = (data?.installments ?? []).filter(
                (i) => i.invoice_id === invoice.id,
              ) as unknown as InstallmentRow[];
              const receipts = (data?.receipts ?? []).filter((r) => r.invoice_id === invoice.id);
              const app = (
                invoice as unknown as { applications?: { application_number: string | null } }
              ).applications;
              const remaining = Number(invoice.grand_total) - Number(invoice.paid_total);

              return (
                <section
                  key={invoice.id}
                  className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-card"
                >
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-foreground">
                        طلب رقم {app?.application_number ?? "—"}
                      </p>
                      <p className="text-xs font-bold text-muted-foreground">
                        العام الدراسي {invoice.academic_year} —{" "}
                        {invoice.plan_type === "full"
                          ? "سداد دفعة واحدة"
                          : `مجدولة على ${invoice.installments_count} دفعات`}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-lg font-black text-primary">{money(remaining)}</p>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        المتبقي من أصل {money(invoice.grand_total)}
                      </p>
                    </div>
                  </header>

                  {invoice.qurra_covered ? (
                    <p className="mt-4 flex items-start gap-2 rounded-2xl bg-mint/20 p-4 text-xs font-black leading-relaxed text-foreground">
                      <Sparkles className="mt-0.5 size-4 shrink-0" />
                      {Number(invoice.grand_total) > 0
                        ? (settings?.qurra_services_message_ar ??
                          "الرسوم الدراسية مغطاة عبر دعم قرة، والمبالغ أدناه تخص الخدمات الإضافية.")
                        : (settings?.qurra_message_ar ??
                          "يتم سداد المستحقات المالية الدراسية فقط من خلال قرة")}
                    </p>
                  ) : null}

                  {Number(invoice.grand_total) > 0 ? (
                    <div className="mt-5">
                      <ScheduleList
                        rows={rows}
                        lateAfterDays={lateAfter}
                        actions={(row) =>
                          <div className="flex items-center gap-1.5">
                            {row.status === "paid" ? (
                              <Button
                                size="sm"
                                className="rounded-xl"
                                onClick={() =>
                                  openDocument(
                                    {
                                      bank: bank ?? null,
                                      applicationNumber: app?.application_number ?? null,
                                      parentName: profile?.full_name ?? null,
                                      seq: row.seq,
                                      amount: Number(row.paid_amount || row.amount),
                                      dueDate: row.due_date,
                                      academicYear: invoice.academic_year,
                                      paid: true,
                                      paidAt: row.due_date,
                                      receiptNo: `${app?.application_number ?? "MN"}-R${String(
                                        row.seq,
                                      ).padStart(2, "0")}`,
                                      invoiceTotal: Number(invoice.grand_total),
                                      invoicePaidTotal: Number(invoice.paid_total),
                                    },
                                    "سند استلام مبلغ",
                                  )
                                }
                              >
                                <ReceiptText className="size-3.5" />
                                سند السداد
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() =>
                                  openDocument(
                                    {
                                      bank: bank ?? null,
                                      applicationNumber: app?.application_number ?? null,
                                      parentName: profile?.full_name ?? null,
                                      seq: row.seq,
                                      amount: Number(row.amount),
                                      dueDate: row.due_date,
                                      academicYear: invoice.academic_year,
                                      paid: false,
                                    },
                                    "نموذج سداد رسوم",
                                  )
                                }
                              >
                                <Printer className="size-3.5" />
                                طباعة النموذج
                              </Button>
                            )}
                            {row.status === "due" ? (
                              <Button
                                size="sm"
                                className="rounded-xl"
                                onClick={() =>
                                  setDialog({
                                    invoiceId: invoice.id,
                                    installmentId: row.id,
                                    amount: Number(row.amount),
                                  })
                                }
                              >
                                <Upload className="size-3.5" />
                                رفع الإيصال
                              </Button>
                            ) : null}
                          </div>
                        }
                      />
                    </div>
                  ) : null}

                  {receipts.length ? (
                    <div className="mt-5 space-y-2">
                      <p className="text-xs font-black text-muted-foreground">الإيصالات المرفوعة</p>
                      {receipts.map((receipt) => (
                        <div
                          key={receipt.id}
                          className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-3 text-start"
                        >
                          <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <FileText className="size-4 text-muted-foreground" />
                            {receipt.file_name ?? "إيصال"} — {money(Number(receipt.amount))}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-muted-foreground">
                              {RECEIPT_STATUS_LABELS[receipt.status]} · {dateAr(receipt.created_at)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => openPreview(receipt)}
                            >
                              <Eye className="size-3.5" />
                              معاينة
                            </Button>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5">
                    <InvoiceChat invoiceId={invoice.id} />
                  </div>
                </section>
              );
            })}
            {invoices.length > 0 && visibleInvoices.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-8 text-center text-sm font-bold text-muted-foreground">
                لا توجد نتائج مطابقة للبحث.
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-border/60 bg-card p-5">
              <p className="flex items-center gap-2 text-sm font-black text-foreground">
                <Wallet className="size-4" />
                طريقة السداد
              </p>
              <p className="mt-2 text-xs font-bold leading-relaxed text-muted-foreground">
                حوّل المبلغ إلى الحساب البنكي أدناه ثم ارفع صورة الإيصال أمام الدفعة المستحقة ليتم
                اعتمادها من قسم الحسابات.
              </p>
            </div>
            <BankCard account={bank ?? null} />
          </aside>
        </div>
      )}

      {dialog ? (
        <ReceiptDialog
          open
          onOpenChange={(v) => !v && setDialog(null)}
          invoiceId={dialog.invoiceId}
          installmentId={dialog.installmentId}
          amount={dialog.amount}
          onDone={() => queryClient.invalidateQueries({ queryKey: ["my-finance"] })}
        />
      ) : null}

      {doc ? (
        <DocumentPreviewDialog
          open
          onOpenChange={(v) => !v && setDoc(null)}
          title={doc.title}
          html={doc.html}
          fileName={doc.fileName}
        />
      ) : null}

      <ReceiptPreviewDialog receipt={preview} onOpenChange={(v) => !v && setPreview(null)} />
    </PortalLayout>
  );
}