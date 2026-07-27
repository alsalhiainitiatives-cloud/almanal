import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ListOrdered } from "lucide-react";
import { amsWaitingList } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows, formatDateTime } from "@/features/ams/components/atoms";
export const Route = createFileRoute("/_authenticated/ams/waiting-list")({
  head: () => ({
    meta: [
      { title: "قائمة الانتظار — مدارس وروضة المنال" },
      { name: "description", content: "ترتيب الطلبات على قوائم انتظار الفصول." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WaitingListPage,
});
function WaitingListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "waiting-list"],
    queryFn: () => amsWaitingList(),
  });
  return (
    <AmsShell title="قائمة الانتظار" description="الطلبات بانتظار توفّر مقعد في الفصول">
      {error ? (
        <EmptyState title="تعذّر التحميل" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={6} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<ListOrdered className="size-5" />}
          title="قائمة الانتظار فارغة"
          description="لا توجد طلبات بانتظار مقاعد حاليًا."
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="bg-muted/40 text-[11px] font-extrabold text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-start">الترتيب</th>
                <th className="px-3 py-3 text-start">رقم الطلب</th>
                <th className="px-3 py-3 text-start">الفصل</th>
                <th className="px-3 py-3 text-start">الحالة</th>
                <th className="px-3 py-3 text-start">تاريخ الإضافة</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry, index) => (
                <tr key={entry.id} className="border-t border-border/50 hover:bg-accent/40">
                  <td className="px-3 py-3 font-extrabold">{index + 1}</td>
                  <td className="px-3 py-3">
                    <Link
                      to="/ams/applications/$applicationId"
                      params={{ applicationId: entry.application_id }}
                      className="font-extrabold text-foreground hover:text-primary"
                    >
                      {entry.applications?.application_number ?? "بدون رقم"}
                    </Link>
                  </td>
                  <td className="px-3 py-3 font-bold text-muted-foreground">{entry.classrooms?.name_ar ?? "—"}</td>
                  <td className="px-3 py-3 font-bold text-muted-foreground">{entry.status}</td>
                  <td className="px-3 py-3 text-[10px] font-bold text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AmsShell>
  );
}