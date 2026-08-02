import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  BellRing,
  Check,
  FileText,
  Loader2,
  MessageCircle,
  Search,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScheduleList, type InstallmentRow } from "@/features/finance/components/ScheduleList";
import { InvoiceChat } from "@/features/finance/components/InvoiceChat";
import {
  financeOverviewGet,
  installmentRemind,
  installmentSetStatus,
  overdueNotifyAll,
  receiptReview,
  receiptSignedUrl,
} from "@/features/finance/finance.functions";
import {
  RECEIPT_STATUS_LABELS,
  dateAr,
  fillTemplate,
  isOverdue,
  money,
  whatsappUrl,
} from "@/features/finance/pricing";
import { cn } from "@/lib/utils";

const KEY = ["ams", "finance"];

export function FinanceBoard({ canManage }: { canManage: boolean }) {
  const load = useServerFn(financeOverviewGet);
  const review = useServerFn(receiptReview);
  const setStatus = useServerFn(installmentSetStatus);
  const remind = useServerFn(installmentRemind);
  const notifyAll = useServerFn(overdueNotifyAll);
  const sign = useServerFn(receiptSignedUrl);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => load() });

  const invoices = data?.invoices ?? [];
  const installments = (data?.installments ?? []) as unknown as InstallmentRow[];
  const receipts = data?.receipts ?? [];
  const lateAfter = data?.planSettings?.late_after_days ?? 0;

  const profileOf = (parentId: string) => (data?.profiles ?? []).find((p) => p.id === parentId);
  const childOf = (applicationId: string) =>
    (data?.children ?? []).find((c) => c.application_id === applicationId)?.name_ar ?? "الطالب";

  const kpis = useMemo(() => {
    const billed = invoices.reduce((s, i) => s + Number(i.grand_total), 0);
    const collected = invoices.reduce((s, i) => s + Number(i.paid_total), 0);
    const overdue = installments.filter((i) => isOverdue(i, lateAfter));
    const pending = receipts.filter((r) => r.status === "pending");
    return {
      billed,
      collected,
      outstanding: billed - collected,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((s, i) => s + Number(i.amount), 0),
      pending: pending.length,
      rate: billed > 0 ? Math.round((collected / billed) * 100) : 0,
    };
  }, [invoices, installments, receipts, lateAfter]);

  const filtered = invoices.filter((invoice) => {
    if (!search.trim()) return true;
    const q = search.trim();
    const app = (invoice as unknown as { applications?: { application_number: string | null } })
      .applications;
    const profile = profileOf(invoice.parent_id);
    return (
      (app?.application_number ?? "").includes(q) ||
      (profile?.full_name ?? "").includes(q) ||
      (profile?.phone ?? "").includes(q) ||
      childOf(invoice.application_id).includes(q)
    );
  });

  const active = filtered.find((i) => i.id === selected) ?? filtered[0] ?? null;
  const activeRows = active ? installments.filter((i) => i.invoice_id === active.id) : [];
  const activeReceipts = active ? receipts.filter((r) => r.invoice_id === active.id) : [];
  const activeProfile = active ? profileOf(active.parent_id) : undefined;

  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تنفيذ الإجراء");
    } finally {
      setBusy(false);
    }
  }

  async function openReceipt(path: string) {
    try {
      const { url } = await sign({ data: { path } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر فتح الإيصال");
    }
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-muted-foreground">
          تنبيه فوري داخل النظام لكل ولي أمر لديه دفعة متأخرة، إضافة إلى زر واتساب بجانب كل دفعة.
        </p>
        <Button
          size="sm"
          className="rounded-xl"
          disabled={busy || !canManage || kpis.overdueCount === 0}
          onClick={() =>
            run(async () => {
              const res = await notifyAll();
              toast.info(`تم إرسال ${res.sent} تنبيهًا`);
            }, "تم تنبيه أولياء الأمور المتأخرين")
          }
        >
          <TriangleAlert className="size-3.5" /> تنبيه جميع المتأخرين ({kpis.overdueCount})
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="إجمالي المفوتر" value={money(kpis.billed)} icon={Wallet} />
        <Kpi label="المحصّل" value={money(kpis.collected)} hint={`نسبة التحصيل ${kpis.rate}%`} icon={BadgeCheck} tone="mint" />
        <Kpi label="المتبقي" value={money(kpis.outstanding)} icon={FileText} />
        <Kpi
          label="دفعات متأخرة"
          value={`${kpis.overdueCount}`}
          hint={money(kpis.overdueAmount)}
          icon={TriangleAlert}
          tone="danger"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-border/60 bg-card p-4">
          <div className="relative">
            <Search className="absolute inset-inline-start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الطلب أو اسم ولي الأمر"
              className="rounded-2xl ps-9"
            />
          </div>

          <ul className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto">
            {filtered.map((invoice) => {
              const app = (
                invoice as unknown as { applications?: { application_number: string | null } }
              ).applications;
              const rows = installments.filter((i) => i.invoice_id === invoice.id);
              const late = rows.some((r) => isOverdue(r, lateAfter));
              return (
                <li key={invoice.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(invoice.id)}
                    className={cn(
                      "w-full rounded-2xl border p-3 text-start transition-colors",
                      active?.id === invoice.id
                        ? "border-primary bg-primary/5"
                        : "border-border/60 hover:border-primary/40",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-foreground">
                        {app?.application_number ?? "بدون رقم"}
                      </span>
                      {late ? (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-black text-destructive">
                          متأخر
                        </span>
                      ) : invoice.status === "paid" ? (
                        <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-black text-mint-foreground">
                          مسدد
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-[11px] font-bold text-muted-foreground">
                      {profileOf(invoice.parent_id)?.full_name ?? "ولي أمر"} — {childOf(invoice.application_id)}
                    </span>
                    <span className="mt-1 block text-[11px] font-black text-primary">
                      المتبقي {money(Number(invoice.grand_total) - Number(invoice.paid_total))}
                    </span>
                  </button>
                </li>
              );
            })}
            {!filtered.length ? (
              <li className="rounded-2xl border-2 border-dashed border-border/70 p-6 text-center text-xs font-bold text-muted-foreground">
                لا توجد فواتير مطابقة.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="space-y-5">
          {active ? (
            <>
              <section className="rounded-[2rem] border border-border/60 bg-card p-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-foreground">
                      {activeProfile?.full_name ?? "ولي أمر"} — {childOf(active.application_id)}
                    </p>
                    <p className="text-xs font-bold text-muted-foreground">
                      {active.plan_type === "full"
                        ? "سداد دفعة واحدة"
                        : `مجدولة على ${active.installments_count} دفعات`}{" "}
                      · {activeProfile?.phone ?? "بدون جوال"}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-lg font-black text-primary">
                      {money(Number(active.grand_total) - Number(active.paid_total))}
                    </p>
                    <p className="text-[11px] font-bold text-muted-foreground">
                      محصّل {money(active.paid_total)} من {money(active.grand_total)}
                    </p>
                  </div>
                </header>

                {active.qurra_covered ? (
                  <p className="mt-4 rounded-2xl bg-mint/20 p-3 text-xs font-black text-foreground">
                    الرسوم الدراسية مغطاة عبر دعم قرة — المبالغ المستحقة تخص الخدمات الإضافية فقط.
                  </p>
                ) : null}

                <div className="mt-5">
                  <ScheduleList
                    rows={activeRows}
                    lateAfterDays={lateAfter}
                    actions={(row) => {
                      const template =
                        data?.settings?.whatsapp_template ??
                        "السلام عليكم {parent}، لديكم دفعة مستحقة رقم {seq} بمبلغ {amount} ريال.";
                      const link = whatsappUrl(
                        activeProfile?.phone,
                        fillTemplate(template, {
                          parent: activeProfile?.full_name ?? "",
                          child: childOf(active.application_id),
                          seq: row.seq,
                          amount: Math.round(Number(row.amount)),
                          due: dateAr(row.due_date),
                          school: "روضة ومدارس المنال",
                        }),
                      );
                      return (
                        <div className="flex items-center gap-1.5">
                          {link && row.status !== "paid" ? (
                            <Button asChild size="sm" variant="outline" className="rounded-xl">
                              <a href={link} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="size-3.5" />
                                واتساب
                              </a>
                            </Button>
                          ) : null}
                          {canManage && row.status !== "paid" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () => remind({ data: { installmentId: row.id } }),
                                    "تم إرسال تذكير لولي الأمر",
                                  )
                                }
                              >
                                <BellRing className="size-3.5" />
                                تذكير
                              </Button>
                              <Button
                                size="sm"
                                className="rounded-xl"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () => setStatus({ data: { id: row.id, status: "paid" } }),
                                    "تم تسجيل الدفعة كمسددة",
                                  )
                                }
                              >
                                <Check className="size-3.5" />
                                تسجيل سداد
                              </Button>
                            </>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                </div>
              </section>

              <section className="rounded-[2rem] border border-border/60 bg-card p-6">
                <p className="text-sm font-black text-foreground">إيصالات السداد</p>
                {activeReceipts.length ? (
                  <ul className="mt-4 space-y-2.5">
                    {activeReceipts.map((receipt) => (
                      <li
                        key={receipt.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-3"
                      >
                        <button
                          type="button"
                          onClick={() => openReceipt(receipt.file_path)}
                          className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-primary"
                        >
                          <FileText className="size-4" />
                          {receipt.file_name ?? "إيصال"} — {money(Number(receipt.amount))} ·{" "}
                          {dateAr(receipt.transfer_date ?? receipt.created_at)}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-black text-muted-foreground">
                            {RECEIPT_STATUS_LABELS[receipt.status]}
                          </span>
                          {canManage && receipt.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                className="rounded-xl"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () => review({ data: { id: receipt.id, approve: true } }),
                                    "تم اعتماد الإيصال",
                                  )
                                }
                              >
                                <Check className="size-3.5" />
                                اعتماد
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () =>
                                      review({
                                        data: {
                                          id: receipt.id,
                                          approve: false,
                                          note: "الإيصال غير مطابق — يرجى إعادة الرفع",
                                        },
                                      }),
                                    "تم رفض الإيصال",
                                  )
                                }
                              >
                                <X className="size-3.5" />
                                رفض
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 rounded-2xl border-2 border-dashed border-border/70 p-6 text-center text-xs font-bold text-muted-foreground">
                    لم يرفع ولي الأمر أي إيصال بعد.
                  </p>
                )}
              </section>

              <InvoiceChat invoiceId={active.id} asStaff />
            </>
          ) : (
            <div className="rounded-[2rem] border-2 border-dashed border-border/70 p-12 text-center text-sm font-bold text-muted-foreground">
              لا توجد فواتير بعد — تُنشأ الفاتورة تلقائيًا عند اختيار ولي الأمر لخطة السداد.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Wallet;
  tone?: "mint" | "danger";
}) {
  return (
    <div className="rounded-[2rem] border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-muted-foreground">{label}</p>
        <span
          className={cn(
            "grid size-9 place-items-center rounded-2xl",
            tone === "mint"
              ? "bg-mint text-mint-foreground"
              : tone === "danger"
                ? "bg-destructive/15 text-destructive"
                : "bg-muted text-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-xl font-black text-foreground">{value}</p>
      {hint ? <p className="text-[11px] font-bold text-muted-foreground">{hint}</p> : null}
    </div>
  );
}