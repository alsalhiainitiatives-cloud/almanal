import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Baby,
  BadgeCheck,
  BarChart3,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Hourglass,
  Printer,
  RefreshCw,
  Table2,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { amsReports } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, STATUS_LABELS, SkeletonRows } from "@/features/ams/components/atoms";
import {
  FINANCE_COLUMNS,
  PARENT_COLUMNS,
  QURRA_COLUMNS,
  STUDENT_COLUMNS,
  exportCsv,
  exportExcel,
  exportPdf,
  type Column,
  type Row,
} from "@/features/ams/reports-export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ams/reports")({
  head: () => ({
    meta: [
      { title: "مركز التقارير والمؤشرات — مدارس وروضة المنال" },
      {
        name: "description",
        content: "لوحة تقارير شاملة لمؤشرات القبول والمالية ودعم قرة مع تصدير Excel وCSV وPDF.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

const PALETTE = ["#7A1F3D", "#B64A6A", "#C9A227", "#4C8577", "#8A6FA8", "#D08A5A", "#5A7FA8", "#9C4B4B"];

const money = (v: number) => `${Math.round(v).toLocaleString("en-US")} ر.س`;

type DatasetKey = "students" | "qurraStudents" | "parents" | "finance";

const DATASETS: Record<
  DatasetKey,
  { label: string; title: string; file: string; columns: Column[]; search: string[] }
> = {
  students: {
    label: "الطلاب وأولياء الأمور",
    title: "سجل الطلاب وأولياء الأمور",
    file: "students",
    columns: STUDENT_COLUMNS,
    search: ["child_name_ar", "child_national_id", "parent_name", "parent_phone", "application_number"],
  },
  qurraStudents: {
    label: "مستفيدو دعم قرة",
    title: "كشف مستفيدي دعم قرة ومطابقة التحويلات",
    file: "qurra-beneficiaries",
    columns: QURRA_COLUMNS,
    search: ["child_name_ar", "child_national_id", "mother_national_id", "parent_name", "application_number"],
  },
  parents: {
    label: "أولياء الأمور",
    title: "سجل أولياء الأمور والمديونية",
    file: "parents",
    columns: PARENT_COLUMNS,
    search: ["parent_name", "parent_phone", "national_id"],
  },
  finance: {
    label: "الفواتير والسداد",
    title: "تقرير الفواتير وخطط السداد",
    file: "invoices",
    columns: FINANCE_COLUMNS,
    search: ["application_number", "parent_name", "parent_phone"],
  },
};

function ReportsPage() {
  const reports = useQuery({ queryKey: ["ams", "reports"], queryFn: () => amsReports() });
  const [dataset, setDataset] = useState<DatasetKey>("students");
  const [search, setSearch] = useState("");

  const data = reports.data;
  const config = DATASETS[dataset];

  const rows = useMemo<Row[]>(() => {
    const all = (data?.datasets?.[dataset] ?? []) as unknown as Row[];
    const q = search.trim();
    if (!q) return all;
    return all.filter((row) => config.search.some((key) => String(row[key] ?? "").includes(q)));
  }, [data, dataset, search, config]);

  function runExport(kind: "csv" | "excel" | "pdf") {
    if (!rows.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    if (kind === "csv") exportCsv(config.file, config.columns, rows);
    if (kind === "excel") exportExcel(config.file, config.title, config.columns, rows);
    if (kind === "pdf") {
      const opened = exportPdf(config.title, config.columns, rows, `عدد السجلات ${rows.length}`);
      if (!opened) {
        toast.error("يرجى السماح بالنوافذ المنبثقة لإنشاء ملف PDF");
        return;
      }
    }
    toast.success(`تم تصدير ${rows.length} سجلًا`);
  }

  return (
    <AmsShell
      title="مركز التقارير والمؤشرات"
      description="مؤشرات القبول والمالية والموقع ودعم قرة مع تصدير كامل للبيانات"
      actions={
        <Button
          variant="outline"
          className="rounded-2xl text-xs font-bold"
          onClick={() => reports.refetch()}
          disabled={reports.isFetching}
        >
          <RefreshCw className={cn("size-3.5", reports.isFetching && "animate-spin")} /> تحديث
        </Button>
      }
    >
      {reports.error ? (
        <EmptyState title="تعذّر التحميل" description={(reports.error as Error).message} />
      ) : reports.isLoading || !data ? (
        <SkeletonRows rows={8} />
      ) : (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={FileText} label="إجمالي الطلبات" value={data.kpis.submitted} hint={`مسودات ${data.kpis.drafts}`} />
            <Kpi icon={Baby} label="الطلاب المسجلون" value={data.kpis.students} hint={`أولياء أمور ${data.kpis.parents}`} tone="mint" />
            <Kpi icon={BadgeCheck} label="مقبول" value={data.kpis.approved} hint={`نسبة القبول ${data.kpis.conversion}%`} tone="mint" />
            <Kpi icon={Hourglass} label="تحت المعالجة" value={data.kpis.inReview} hint={`متوسط زمن القرار ${data.kpis.avgDecisionDays} يوم`} />
            <Kpi icon={Wallet} label="إجمالي المفوتر" value={money(data.finance.billed)} hint={`محصّل ${money(data.finance.collected)}`} />
            <Kpi icon={HandCoins} label="نسبة التحصيل" value={`${data.finance.collectionRate}%`} hint={`متبقٍ ${money(data.finance.outstanding)}`} tone="mint" />
            <Kpi icon={TriangleAlert} label="دفعات متأخرة" value={data.finance.overdueCount} hint={money(data.finance.overdueAmount)} tone="danger" />
            <Kpi icon={Users} label="المقاعد المشغولة" value={`${data.kpis.seatsTaken}/${data.kpis.seatsCapacity}`} hint={`قائمة انتظار ${data.kpis.waitingList}`} />
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="حركة الطلبات خلال 12 شهرًا" icon={BarChart3}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} reversed />
                  <YAxis tick={{ fontSize: 11 }} orientation="right" allowDecimals={false} />
                  <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="submitted" name="طلبات" stroke={PALETTE[0]} fill={PALETTE[0]} fillOpacity={0.18} />
                  <Area type="monotone" dataKey="approved" name="مقبول" stroke={PALETTE[3]} fill={PALETTE[3]} fillOpacity={0.16} />
                  <Area type="monotone" dataKey="rejected" name="مرفوض" stroke={PALETTE[7]} fill={PALETTE[7]} fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="التحصيل المالي الشهري" icon={Wallet}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} reversed />
                  <YAxis tick={{ fontSize: 11 }} orientation="right" />
                  <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="collected" name="مبالغ محصّلة" stroke={PALETTE[2]} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="messages" name="رسائل الموقع" stroke={PALETTE[4]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="الطلبات حسب الحالة" icon={FileText}>
              <ul className="space-y-2">
                {data.statusBreakdown.map((row) => {
                  const total = data.statusBreakdown.reduce((sum, item) => sum + item.value, 0) || 1;
                  const percent = Math.round((row.value / total) * 100);
                  return (
                    <li key={row.name}>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>{STATUS_LABELS[row.name] ?? row.name}</span>
                        <span className="text-muted-foreground">
                          {row.value} ({percent}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel title="إشغال المراحل" icon={Users}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.stageBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} reversed />
                  <YAxis tick={{ fontSize: 11 }} orientation="right" allowDecimals={false} />
                  <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="capacity" name="السعة" fill={PALETTE[1]} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="taken" name="مشغول" fill={PALETTE[0]} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="applications" name="طلبات" fill={PALETTE[2]} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="توزيع دعم قرة" icon={HandCoins}>
              <Donut rows={data.qurraBreakdown} />
            </Panel>

            <Panel title="الفئات العمرية للطلاب" icon={Baby}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.ageBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} reversed />
                  <YAxis tick={{ fontSize: 11 }} orientation="right" allowDecimals={false} />
                  <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="value" name="طلاب" fill={PALETTE[0]} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="الجنس والجنسيات" icon={Users}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Donut rows={data.genderBreakdown} height={200} />
                <ul className="space-y-1.5 text-[11px] font-bold">
                  {data.nationalityBreakdown.map((row) => (
                    <li key={row.name} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-1.5">
                      <span>{row.name}</span>
                      <span className="text-muted-foreground">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel title="المستندات وتتبع الموقع" icon={FileSpreadsheet}>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                <Stat label="مستندات مرفوعة" value={data.documents.total} />
                <Stat label="بانتظار المراجعة" value={data.documents.pending} />
                <Stat label="معتمدة" value={data.documents.approved} />
                <Stat label="مرفوضة" value={data.documents.rejected} />
                <Stat label="طلبات مستندات مفتوحة" value={data.documents.openRequests} />
                <Stat label="إيصالات بانتظار الاعتماد" value={data.finance.receiptsPending} />
                <Stat label="رسائل تواصل الموقع" value={data.kpis.contactMessages} />
                <Stat label="آراء بانتظار الموافقة" value={data.kpis.testimonialsPending} />
                <Stat label="خدمات مختارة" value={data.servicesSelected} />
                <Stat label="فواتير مغطاة بقرة" value={data.finance.qurraCoveredInvoices} />
              </div>
              {data.programInterest.length ? (
                <ul className="mt-3 space-y-1.5 text-[11px] font-bold">
                  {data.programInterest.map((row) => (
                    <li key={row.name} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-1.5">
                      <span>اهتمام بالبرنامج: {row.name}</span>
                      <span className="text-muted-foreground">{row.value}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Panel>
          </div>

          <section className="rounded-3xl border border-border/60 bg-card p-5">
            <h2 className="text-sm font-extrabold text-foreground">إشغال الفصول بالتفصيل</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-right text-[11px] font-bold">
                <thead className="text-muted-foreground">
                  <tr>
                    {["الفصل", "المرحلة", "السعة", "مشغول", "متاح", "انتظار", "الإشغال"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-2 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.classroomBreakdown.map((room) => (
                    <tr key={`${room.stage}-${room.name}`} className="border-t border-border/50">
                      <td className="px-2 py-2">{room.name}</td>
                      <td className="px-2 py-2 text-muted-foreground">{room.stage}</td>
                      <td className="px-2 py-2">{room.capacity}</td>
                      <td className="px-2 py-2">{room.taken}</td>
                      <td className="px-2 py-2">{room.available}</td>
                      <td className="px-2 py-2">{room.waiting}</td>
                      <td className="px-2 py-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5",
                            room.occupancy >= 100
                              ? "bg-destructive/12 text-destructive"
                              : room.occupancy >= 80
                                ? "bg-gold/70 text-gold-foreground"
                                : "bg-mint text-foreground",
                          )}
                        >
                          {room.occupancy}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                  <Table2 className="size-4 text-primary" /> تصدير البيانات
                </h2>
                <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                  كشف مستفيدي قرة يحتوي هوية الطالب والأم والمبالغ المتوقعة والمحوّلة لمطابقتها مع قوائم قرة.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="rounded-2xl text-xs font-bold" onClick={() => runExport("excel")}>
                  <FileSpreadsheet className="size-3.5" /> Excel
                </Button>
                <Button size="sm" variant="outline" className="rounded-2xl text-xs font-bold" onClick={() => runExport("csv")}>
                  <Table2 className="size-3.5" /> CSV
                </Button>
                <Button size="sm" variant="outline" className="rounded-2xl text-xs font-bold" onClick={() => runExport("pdf")}>
                  <Printer className="size-3.5" /> PDF
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(Object.keys(DATASETS) as DatasetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDataset(key)}
                  className={cn(
                    "rounded-2xl border px-3 py-1.5 text-[11px] font-bold transition-colors",
                    dataset === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {DATASETS[key].label} ({(data.datasets[key] ?? []).length})
                </button>
              ))}
            </div>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهوية أو الجوال أو الرقم الأكاديمي"
              className="mt-3 rounded-2xl text-xs"
            />

            <div className="mt-3 max-h-[420px] overflow-auto rounded-2xl border border-border/50">
              <table className="w-full text-right text-[11px] font-bold">
                <thead className="sticky top-0 bg-muted/70 text-muted-foreground backdrop-blur">
                  <tr>
                    {config.columns.slice(0, 10).map((col) => (
                      <th key={col.key} className="whitespace-nowrap px-2 py-2">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((row, index) => (
                    <tr key={index} className="border-t border-border/40">
                      {config.columns.slice(0, 10).map((col) => (
                        <td key={col.key} className="whitespace-nowrap px-2 py-2">
                          {String(row[col.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                        لا توجد سجلات مطابقة.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] font-bold text-muted-foreground">
              يُعرض أول 100 سجل وأول 10 أعمدة للاستعراض — التصدير يشمل جميع السجلات والأعمدة ({rows.length} سجل).
            </p>
          </section>
        </div>
      )}
    </AmsShell>
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
  value: string | number;
  hint?: string;
  tone?: "mint" | "danger";
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-extrabold text-muted-foreground">{label}</p>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-2xl",
            tone === "mint"
              ? "bg-mint text-foreground"
              : tone === "danger"
                ? "bg-destructive/12 text-destructive"
                : "bg-muted text-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-lg font-black text-foreground">{value}</p>
      {hint ? <p className="text-[10px] font-bold text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Wallet;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/40 px-3 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function Donut({ rows, height = 240 }: { rows: { name: string; value: number }[]; height?: number }) {
  const filtered = rows.filter((r) => r.value > 0);
  if (!filtered.length) {
    return (
      <p className="py-10 text-center text-[11px] font-bold text-muted-foreground">لا توجد بيانات كافية بعد.</p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={2}>
          {filtered.map((row, index) => (
            <Cell key={row.name} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, direction: "rtl" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}