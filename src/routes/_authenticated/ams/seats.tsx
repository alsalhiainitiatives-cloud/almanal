import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Armchair } from "lucide-react";
import { amsOverview } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
export const Route = createFileRoute("/_authenticated/ams/seats")({
  head: () => ({
    meta: [
      { title: "إدارة المقاعد — مدارس وروضة المنال" },
      { name: "description", content: "متابعة سعة الفصول والمقاعد المتاحة والمحجوزة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SeatsPage,
});
function SeatsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["ams", "overview"], queryFn: () => amsOverview() });
  return (
    <AmsShell title="إدارة المقاعد" description="سعة الفصول والإشغال وقوائم الانتظار">
      {error ? (
        <EmptyState title="تعذّر التحميل" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.classrooms.map((classroom) => {
            const left = Math.max(0, classroom.capacity - classroom.taken_seats);
            const percent = classroom.capacity
              ? Math.min(100, Math.round((classroom.taken_seats / classroom.capacity) * 100))
              : 0;
            return (
              <div key={classroom.id} className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-foreground">{classroom.name_ar}</p>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{ background: `${classroom.color_hex}22`, color: classroom.color_hex }}
                  >
                    <Armchair className="size-3" /> {left} متاح
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                  {classroom.teacher_name ?? "—"} · قائمة الانتظار: {classroom.waiting}
                </p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={percent >= 100 ? "h-full bg-destructive" : percent >= 80 ? "h-full bg-gold" : "h-full bg-primary"}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] font-bold text-muted-foreground">
                  {classroom.taken_seats} من {classroom.capacity} مقعدًا ({percent}%)
                </p>
                <Link
                  to="/ams/queue"
                  search={{ status: undefined }}
                  className="mt-3 inline-block text-[11px] font-extrabold text-primary"
                >
                  عرض الطلبات المرتبطة
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </AmsShell>
  );
}