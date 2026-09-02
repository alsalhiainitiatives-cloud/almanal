import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Loader2,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { financeOverviewGet } from "@/features/finance/finance.functions";
import { dateAr, isOverdue, money } from "@/features/finance/pricing";
import { exportExcel, exportPdf, type Column, type Row } from "@/features/ams/reports-export";
import { cn } from "@/lib/utils";

const KEY = ["ams", "finance", "reports"];

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const SUMMARY_COLUMNS: Column[] = [
  { key: "label", label: "البند" },
  { key: "value", label: "القيمة" },
];

const INVOICE_COLUMNS: Column[] = [
  { key: "academic_number", label: "الرقم الأكاديمي" },
  { key: "child", label: "الطالب" },
  { key: "parent", label: "ولي الأمر" },
  { key: "phone", label: "الجوال" },
  { key: "academic_year", label: "العام الدراسي" },
  { key: "plan", label: "خطة السداد" },
  { key: "status", label: "حالة الفاتورة" },
  { key: "tuition", label: "الرسوم الدراسية" },
  { key: "services", label: "الخدمات" },
  { key: "discount", label: "الخصومات" },
  { key: "grand_total", label: "الإجمالي" },
  { key: "paid_total", label: "المسدد" },
  { key: "remaining", label: "المتبقي" },
  { key: "qurra", label: "مغطى بقرة" },
  { key: "installments", label: "عدد الدفعات" },
  { key: "overdue", label: "دفعات متأخرة" },
  { key: "next_due", label: "الاستحقاق القادم" },
];

const AGING_COLUMNS: Column[] = [
  { key: "bucket", label: "فترة التأخر" },
  { key: "count", label: "عدد الدفعات" },
  { key: "amount", label: "المبلغ" },
];

const MONTHLY_COLUMNS: Column[] = [
  { key: "month", label: "الشهر" },
  { key: "due_count", label: "دفعات مستحقة" },
  { key: "due_amount", label: "المبلغ المستحق" },
  { key: "paid_amount", label: "المحصّل" },
];

const PLAN_LABELS: Record<string, string> = {
  full: "دفعة واحدة",
  installments: "أقساط",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  open: "مفتوحة",
  partial: "سداد جزئي",
  paid: "مسددة",
  cancelled: "ملغاة",
  waived: "معفاة",
};

type Tab = "summary" | "invoices" | "aging" | "monthly";

/** Read-only financial analytics for the kindergarten with branded exports. */
export function FinanceReports() {
  const load = useServerFn(financeOverviewGet);
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => load() });
  const [tab, setTab] = useState<Tab>("summary");
  const [year, setYear] = useState<string>("all");

  const lateAfter = data?.planSettings?.late_after_days ?? 0;

  const model = useMemo(() => {
    const allInvoices = data?.invoices ?? [];
    const years = [...new Set(allInvoices.map((i) => i.academic_year).filter(Boolean))] as string[];
    const invoices = year === "all" ? allInvoices : allInvoices.filter((i) => i.academic_year === year);
    const invoiceIds = new Set(invoices.map((i) => i.id));
    const installments = (data?.installments ?? []).filter((i) => invoiceIds.has(i.invoice_id));
    const receipts = (data?.receipts ?? []).filter((r) => invoiceIds.has(r.invoice_id));

    const profileOf = (parentId: string) => (data?.profiles ?? []).find((p) => p.id === parentId);
    const childOf = (applicationId: string) =>
      (data?.children ?? []).find((c) => c.application_id === applicationId)?.name_ar ?? "—";

    const billed = invoices.reduce((s, i) => s + Number(i.grand_total), 0);
    const collected = invoices.reduce((s, i) => s + Number(i.paid_total), 0);
    const discounts = invoices.reduce((s, i) => s + Number(i.discount_total), 0);
    const services = invoices.reduce((s, i) => s + Number(i.services_total), 0);
    const tuition = invoices.reduce((s, i) => s + Number(i.tuition_total), 0);
    const overdueList = installments.filter((i) => isOverdue(i as never, lateAfter));
    const pendingReceipts = receipts.filter((r) => r.status === "pending");
    const qurra = invoices.filter((i) => i.qurra_covered);

    const rows: Row[] = invoices.map((inv) => {
      const own = installments.filter((i) => i.invoice_id === inv.id);
      const late = own.filter((i) => isOverdue(i as never, lateAfter));
      const next = own
        .filter((i) => i.status !== "paid")
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];
      const parent = profileOf(inv.parent_id);
      return {
        academic_number:
          (inv as { applications?: { application_number?: string | null } }).applications
            ?.application_number ?? "—",
        child: childOf(inv.application_id),
        parent: parent?.full_name ?? "—",
        phone: parent?.phone ?? "—",
        academic_year: inv.academic_year ?? "—",
        plan: PLAN_LABELS[inv.plan_type] ?? inv.plan_type,
        status: STATUS_LABELS[inv.status] ?? inv.status,
        tuition: Math.round(Number(inv.tuition_total)),
        services: Math.round(Number(inv.services_total)),
        discount: Math.round(Number(inv.discount_total)),
        grand_total: Math.round(Number(inv.grand_total)),
        paid_total: Math.round(Number(inv.paid_total)),
        remaining: Math.round(Number(inv.grand_total) - Number(inv.paid_total)),
        qurra: inv.qurra_covered ? "نعم" : "لا",
        installments: own.length,
        overdue: late.length,
        next_due: next ? dateAr(next.due_date) : "—",
      };
    });

    const today = new Date();
    const buckets = [
      { bucket: "1 – 30 يومًا", min: 0, max: 30 },
      { bucket: "31 – 60 يومًا", min: 31, max: 60 },
      { bucket: "61 – 90 يومًا", min: 61, max: 90 },
      { bucket: "أكثر من 90 يومًا", min: 91, max: 99999 },
    ];
    const aging: Row[] = buckets.map((b) => {
      const list = overdueList.filter((i) => {
        const days = Math.floor(
          (today.getTime() - new Date(String(i.due_date)).getTime()) / 86_400_000,
        );
        return days >= b.min && days <= b.max;
      });
      return {
        bucket: b.bucket,
        count: list.length,
        amount: Math.round(list.reduce((s, i) => s + Number(i.amount), 0)),
      };
    });

    const monthMap = new Map<string, { due: number; dueAmount: number; paid: number }>();
    for (const inst of installments) {
      const due = String(inst.due_date ?? "");
      if (due.length < 7) continue;
      const key = due.slice(0, 7);
      const entry = monthMap.get(key) ?? { due: 0, dueAmount: 0, paid: 0 };
      entry.due += 1;
      entry.dueAmount += Number(inst.amount);
      entry.paid += Number(inst.paid_amount ?? 0);
      monthMap.set(key, entry);
    }
    const monthly: Row[] = [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, v]) => {
        const [y, m] = key.split("-");
        return {
          month: `${MONTHS_AR[Number(m) - 1] ?? m} ${y}`,
          due_count: v.due,
          due_amount: Math.round(v.dueAmount),
          paid_amount: Math.round(v.paid),
        };
      });

    const summary: Row[] = [
      { label: "عدد الفواتير", value: invoices.length },
      { label: "إجمالي المفوتر", value: Math.round(billed) },
      { label: "المحصّل", value: Math.round(collected) },
      { label: "المتبقي", value: Math.round(billed - collected) },
      {
        label: "نسبة التحصيل",
        value: `${billed > 0 ? Math.round((collected / billed) * 100) : 0}%`,
      },
      { label: "الرسوم الدراسية", value: Math.round(tuition) },
      { label: "الخدمات الإضافية", value: Math.round(services) },
      { label: "الخصومات الممنوحة", value: Math.round(discounts) },
      { label: "عدد الدفعات المتأخرة", value: overdueList.length },
      {
        label: "مبلغ الدفعات المتأخرة",
        value: Math.round(overdueList.reduce((s, i) => s + Number(i.amount), 0)),
      },
      { label: "إيصالات بانتظار الاعتماد", value: pendingReceipts.length },
      { label: "فواتير مشمولة بدعم قرة", value: qurra.length },
      { label: "طلبات بلا خطة سداد", value: (data?.unplanned ?? []).length },
    ];

    return {
      years,
      invoices,
      rows,
      aging,
      monthly,
      summary,
      kpis: {
        billed,
        collected,
        outstanding: billed - collected,
        rate: billed > 0 ? Math.round((collected / billed) * 100) : 0,
        overdueCount: overdueList.length,
        overdueAmount: overdueList.reduce((s, i) => s + Number(i.amount), 0),
        pending: pendingReceipts.length,
      },
    };
  }, [data, lateAfter, year]);

  const active = {
    summary: { columns: SUMMARY_COLUMNS, rows: model.summary, title: "الملخص المالي العام" },
    invoices: { columns: INVOICE_COLUMNS, rows: model.rows, title: "تقرير الفواتير التفصيلي" },
    aging: { columns: AGING_COLUMNS, rows: model.aging, title: "تقرير أعمار المتأخرات" },
    monthly: { columns: MONTHLY_COLUMNS, rows: model.monthly, title: "التحصيل الشهري" },
  }[tab];

  const subtitle = `${year === "all" ? "كل الأعوام الدراسية" : year} — ${active.rows.length} سجل`;

  if (isLoading || !data) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Wallet} label="إجمالي المفوتر" value={money(model.kpis.billed)} />
        <Kpi
          icon={BadgeCheck}
          label="المحصّل"
          value={money(model.kpis.collected)}
          hint={`نسبة التحصيل ${model.kpis.rate}%`}
          tone="mint"
        />
        <Kpi icon={BarChart3} label="المتبقي" value={money(model.kpis.outstanding)} />
        <Kpi
          icon={TriangleAlert}
          label="متأخرات"
          value={money(model.kpis.overdueAmount)}
          hint={`${model.kpis.overdueCount} دفعة متأخرة · ${model.kpis.pending} إيصال بانتظار الاعتماد`}
          tone="warn"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["summary", "الملخص العام"],
              ["invoices", "الفواتير التفصيلية"],
              ["aging", "أعمار المتأخرات"],
              ["monthly", "التحصيل الشهري"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-2xl px-3 py-2 text-xs font-black transition",
                tab === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border/60 bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            dir="rtl"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-2xl border border-border/60 bg-background px-3 py-2 text-xs font-bold"
          >
            <option value="all">كل الأعوام الدراسية</option>
            {model.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            className="rounded-2xl text-xs font-bold"
            onClick={() => {
              exportExcel("finance-report", active.title, active.columns, active.rows);
              toast.success("تم تنزيل ملف الإكسل");
            }}
          >
            <FileSpreadsheet className="size-3.5" />
            تصدير إكسل
          </Button>
          <Button
            className="rounded-2xl text-xs font-bold"
            onClick={() => {
              const ok = exportPdf(active.title, active.columns, active.rows, subtitle);
              if (!ok) toast.error("يرجى السماح بالنوافذ المنبثقة لإتمام الطباعة");
            }}
          >
            <FileText className="size-3.5" />
            تصدير PDF
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
        <div className="border-b border-border/60 px-5 py-3">
          <p className="text-sm font-black text-foreground">{active.title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="bg-muted/50 text-right">
              <tr>
                {active.columns.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-3 py-2 font-black text-foreground">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={active.columns.length}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    لا توجد بيانات لهذا التقرير بعد.
                  </td>
                </tr>
              ) : (
                active.rows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 ? "bg-muted/20" : undefined}>
                    {active.columns.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-3 py-2 text-foreground">
                        {row[c.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  tone?: "mint" | "warn";
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-black text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
        </div>
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-2xl",
            tone === "mint"
              ? "bg-mint/60 text-foreground"
              : tone === "warn"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
