import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowLeft, Inbox } from "lucide-react";
import { motion } from "motion/react";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows, formatDateTime } from "@/features/ams/components/atoms";
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
const KPI_CARDS = [
  { key: "today", label: "طلبات اليوم" },
  { key: "week", label: "طلبات الأسبوع" },
  { key: "pendingReview", label: "قيد المراجعة" },
  { key: "principalReview", label: "بانتظار المدير" },
  { key: "needsAction", label: "بحاجة إجراء" },
  { key: "approved", label: "مقبولة" },
  { key: "rejected", label: "مرفوضة" },
  { key: "waitlisted", label: "قائمة الانتظار" },
  { key: "qurra", label: "طلبات قرة" },
  { key: "unassigned", label: "غير مُسندة" },
  { key: "seatsAvailable", label: "مقاعد متاحة" },
  { key: "admittedToday", label: "قبول اليوم" },
] as const;
function AmsDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "overview"],
    queryFn: () => amsOverview(),
  });
  return (
    <AmsShell
      title="لوحة قيادة القبول"
      description="نظرة شاملة على أداء القبول والمقاعد والحركة اللحظية"
      actions={
        <Link
          to="/ams/queue"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          <Inbox className="size-3.5" /> قائمة الطلبات
        </Link>
      }
    >
      {error ? (
        <EmptyState title="لا تملك صلاحية الوصول" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={8} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {KPI_CARDS.map((card, index) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm"
              >
                <p className="text-[11px] font-bold text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">{data.kpis[card.key]}</p>
              </motion.div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-3xl border border-border/60 bg-card p-5">
              <h2 className="text-sm font-extrabold text-foreground">إشغال الفصول</h2>
              <ul className="mt-3 space-y-2.5">
                {data.classrooms.map((classroom) => {
                  const percent = classroom.capacity
                    ? Math.min(100, Math.round((classroom.taken_seats / classroom.capacity) * 100))
                    : 0;
                  return (
                    <li key={classroom.id}>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-foreground">{classroom.name_ar}</span>
                        <span className="text-muted-foreground">
                          {classroom.taken_seats}/{classroom.capacity} · انتظار {classroom.waiting}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={
                            percent >= 100 ? "h-full bg-destructive" : percent >= 80 ? "h-full bg-gold" : "h-full bg-primary"
                          }
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="rounded-3xl border border-border/60 bg-card p-5">
              <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                <Activity className="size-4 text-primary" /> الحركة اللحظية
              </h2>
              <ol className="mt-3 max-h-[420px] space-y-3 overflow-y-auto border-s border-border/60 ps-4">
                {data.activity.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
                    <Link
                      to="/ams/applications/$applicationId"
                      params={{ applicationId: event.application_id }}
                      className="group block"
                    >
                      <p className="text-xs font-extrabold text-foreground group-hover:text-primary">
                        {event.title_ar}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                        {event.actorName} · {formatDateTime(event.created_at)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <section className="rounded-3xl border border-border/60 bg-card p-5">
            <h2 className="text-sm font-extrabold text-foreground">توزيع الحالات</h2>
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