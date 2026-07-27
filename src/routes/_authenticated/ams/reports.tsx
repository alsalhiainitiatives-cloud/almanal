import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { amsOverview, amsQueue } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, STATUS_LABELS, SkeletonRows } from "@/features/ams/components/atoms";
export const Route = createFileRoute("/_authenticated/ams/reports")({
  head: () => ({
    meta: [
      { title: "تقارير القبول — مدارس وروضة المنال" },
      { name: "description", content: "تقارير ومؤشرات القبول وتصدير البيانات." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});
function ReportsPage() {
  const overview = useQuery({ queryKey: ["ams", "overview"], queryFn: () => amsOverview() });
  const queue = useQuery({ queryKey: ["ams", "queue", {}], queryFn: () => amsQueue({ data: {} }) });
  function exportCsv() {
    const rows = queue.data ?? [];
    const header = ["رقم الطلب", "ولي الأمر", "الطلاب", "الحالة", "الأولوية", "السداد", "الإجمالي"];
    const body = rows.map((row) => [
      row.application_number ?? "",
      row.parentName,
      row.children.map((child) => child.name_ar).join(" | "),
      STATUS_LABELS[row.status] ?? row.status,
      row.priority,
      row.payment_status,
      String(row.grand_total ?? ""),
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `admissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <AmsShell
      title="التقارير"
      description="مؤشرات القبول وتصدير بيانات الطلبات"
      actions={
        <Button className="rounded-2xl text-xs font-bold" onClick={exportCsv} disabled={!queue.data?.length}>
          <Download className="size-3.5" /> تصدير CSV
        </Button>
      }
    >
      {overview.error ? (
        <EmptyState title="تعذّر التحميل" description={(overview.error as Error).message} />
      ) : overview.isLoading || !overview.data ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="space-y-4">
          <section className="rounded-3xl border border-border/60 bg-card p-5">
            <h2 className="text-sm font-extrabold text-foreground">الطلبات حسب الحالة</h2>
            <ul className="mt-3 space-y-2">
              {overview.data.statusBreakdown.map((row) => {
                const total = overview.data.statusBreakdown.reduce((sum, item) => sum + item.count, 0) || 1;
                const percent = Math.round((row.count / total) * 100);
                return (
                  <li key={row.status}>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{STATUS_LABELS[row.status] ?? row.status}</span>
                      <span className="text-muted-foreground">
                        {row.count} ({percent}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="rounded-3xl border border-border/60 bg-card p-5">
            <h2 className="text-sm font-extrabold text-foreground">إشغال المراحل</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {overview.data.stages.map((stage) => (
                <li key={stage.id} className="rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 text-[11px] font-bold">
                  {stage.name_ar}: {stage.taken_seats}/{stage.total_seats}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AmsShell>
  );
}