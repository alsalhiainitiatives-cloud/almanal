import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowLeft, ChartPie, DoorOpen, Inbox, LineChart } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import { STATUS_LABELS } from "@/features/ams/components/atoms";
import { amsOverview } from "@/features/ams/ams.functions";
export const Route = createFileRoute("/_authenticated/ams/")({
  head: () => ({
    meta: [
      { title: "لوحة قيادة القبول — مدارس وروضة المنال" },
      { name: "description", content: "مؤشرات الأداء وحركة طلبات القبول لحظة بلحظة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AmsDashboard,
});

const HEADLINE = [
  { key: "total", label: "إجمالي الطلبات", hint: "كل الطلبات المسجلة" },
  { key: "active", label: "طلبات نشطة", hint: "قيد المعالجة حاليًا" },
  { key: "drafts", label: "مسودات لم تُرسل", hint: "لم يكملها أولياء الأمور" },
  { key: "today", label: "طلبات اليوم", hint: "وردت خلال اليوم" },
] as const;

const WORKFLOW = [
  { key: "pendingReview", label: "قيد المراجعة", status: "under_review" },
  { key: "needsAction", label: "بحاجة إجراء من ولي الأمر", status: "needs_action" },
  { key: "principalReview", label: "بانتظار قرار المدير", status: "principal_review" },
  { key: "unassigned", label: "غير مُسندة لموظف", status: null },
] as const;

const OUTCOMES = [
  { key: "approved", label: "مقبولة", status: "approved" },
  { key: "rejected", label: "مرفوضة", status: "rejected" },
  { key: "waitlisted", label: "قائمة الانتظار", status: "waitlisted" },
  { key: "qurra", label: "طلبات قرة", status: null },
  { key: "seatsAvailable", label: "مقاعد متاحة", status: null },
  { key: "waitingList", label: "بانتظار مقعد", status: null },
] as const;

function Donut({ percent, color }: { percent: number; color: string }) {
  return (
    <div
      className="grid size-16 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${percent * 3.6}deg, hsl(var(--muted)) 0deg)` }}
    >
      <span className="grid size-11 place-items-center rounded-full bg-card text-[11px] font-extrabold text-foreground">
        {percent}%
      </span>
    </div>
  );
}

function AmsDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "overview"],
    queryFn: () => amsOverview(),
  });
  const [chart, setChart] = useState<"bars" | "donuts">("bars");
  return (
    <AmsShell
      title="لوحة قيادة القبول"
      description="نظرة شاملة على أداء القبول وسير العمل وإشغال الفصول"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/ams/seasons"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-border/60 bg-card px-4 py-2 text-xs font-bold text-foreground"
          >
            <DoorOpen className="size-3.5" /> فتح / إغلاق باب التسجيل
          </Link>
          <Link
            to="/ams/queue"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            <Inbox className="size-3.5" /> قائمة الطلبات
          </Link>
        </div>
      }
    >
      {error ? (
        <EmptyState title="لا تملك صلاحية الوصول" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={8} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {HEADLINE.map((card, index) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <p className="text-xs font-bold text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{data.kpis[card.key]}</p>
                <p className="mt-1 text-[11px] font-bold text-muted-foreground/80">{card.hint}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-border/60 bg-card p-5">
              <h2 className="text-sm font-extrabold text-foreground">مسار العمل</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {WORKFLOW.map((item) => (
                  <Link
                    key={item.key}
                    to="/ams/queue"
                    search={{ status: item.status ?? undefined }}
                    className="rounded-2xl border border-border/60 bg-muted/25 p-3 transition-colors hover:border-primary"
                  >
                    <p className="text-[11px] font-bold text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-xl font-extrabold text-foreground">{data.kpis[item.key]}</p>
                  </Link>
                ))}
              </div>
            </section>
            <section className="rounded-3xl border border-border/60 bg-card p-5">
              <h2 className="text-sm font-extrabold text-foreground">النتائج والمقاعد</h2>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {OUTCOMES.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-border/60 bg-muted/25 p-3">
                    <p className="text-[11px] font-bold text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-xl font-extrabold text-foreground">{data.kpis[item.key]}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-border/60 bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-foreground">إشغال الفصول حسب المرحلة</h2>
              <div className="flex items-center gap-1 rounded-2xl border border-border/60 p-1">
                <button
                  type="button"
                  onClick={() => setChart("bars")}
                  className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold ${chart === "bars" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  <LineChart className="size-3.5" /> خطي
                </button>
                <button
                  type="button"
                  onClick={() => setChart("donuts")}
                  className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold ${chart === "donuts" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  <ChartPie className="size-3.5" /> دائري
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-5">
              {data.occupancyByStage.map((stage) => (
                <div key={stage.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-foreground">{stage.name_ar}</p>
                    <p className="text-[11px] font-bold text-muted-foreground">
                      {stage.taken} من {stage.capacity} مقعدًا · انتظار {stage.waiting}
                    </p>
                  </div>
                  <div
                    className={
                      chart === "bars"
                        ? "mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
                        : "mt-2 grid gap-3 sm:grid-cols-3 xl:grid-cols-5"
                    }
                  >
                    {stage.classrooms.map((classroom) => {
                      const percent = classroom.capacity
                        ? Math.min(100, Math.round((classroom.taken_seats / classroom.capacity) * 100))
                        : 0;
                      return chart === "bars" ? (
                        <div key={classroom.id} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="flex items-center gap-1.5 text-foreground">
                              <span className="size-2.5 rounded-full" style={{ background: classroom.color_hex }} />
                              {classroom.name_ar}
                            </span>
                            <span className="text-muted-foreground">
                              {classroom.taken_seats}/{classroom.capacity}
                            </span>
                          </div>
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percent}%`, background: classroom.color_hex }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] font-bold text-muted-foreground">
                            متاح {Math.max(0, classroom.capacity - classroom.taken_seats)} · انتظار {classroom.waiting}
                          </p>
                        </div>
                      ) : (
                        <div
                          key={classroom.id}
                          className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
                        >
                          <Donut percent={percent} color={classroom.color_hex} />
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-extrabold text-foreground">{classroom.name_ar}</p>
                            <p className="text-[10px] font-bold text-muted-foreground">
                              {classroom.taken_seats}/{classroom.capacity} · انتظار {classroom.waiting}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-foreground">توزيع الحالات</h2>
              <Link to="/ams/activity" className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary">
                <Activity className="size-3.5" /> سجل الحركة اللحظية
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.statusBreakdown.map((row) => (
                <Link
                  key={row.status}
                  to="/ams/queue"
                  search={{ status: row.status }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/25 px-3 py-2 text-[11px] font-bold hover:border-primary"
                >
                  {STATUS_LABELS[row.status] ?? row.status}
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{row.count}</span>
                  <ArrowLeft className="size-3" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </AmsShell>
  );
}