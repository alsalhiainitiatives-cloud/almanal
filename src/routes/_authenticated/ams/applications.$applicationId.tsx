import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Archive, ArrowRight, Pin, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { amsArchive, amsTogglePin, amsWorkspace } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, PriorityPill, SkeletonRows, StatusPill } from "@/features/ams/components/atoms";
import { ActionCenter } from "@/features/ams/components/workspace/ActionCenter";
import { ApplicantPanel } from "@/features/ams/components/workspace/ApplicantPanel";
import { InsightBar } from "@/features/ams/components/workspace/InsightBar";
import { TimelinePanel } from "@/features/ams/components/workspace/TimelinePanel";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/_authenticated/ams/applications/$applicationId")({
  head: () => ({
    meta: [
      { title: "ملف طلب القبول — مدارس وروضة المنال" },
      { name: "description", content: "مساحة عمل مراجعة الطلب واتخاذ القرار." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspacePage,
});
function WorkspacePage() {
  const { applicationId } = Route.useParams();
  const queryClient = useQueryClient();
  const togglePin = useServerFn(amsTogglePin);
  const archive = useServerFn(amsArchive);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "workspace", applicationId],
    queryFn: () => amsWorkspace({ data: applicationId }),
  });
  const pin = useMutation({
    mutationFn: (pinned: boolean) => togglePin({ data: { id: applicationId, pinned } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ams"] }),
  });
  const archiveMutation = useMutation({
    mutationFn: () => archive({ data: { id: applicationId } }),
    onSuccess: () => {
      toast.success("تمت أرشفة الطلب");
      queryClient.invalidateQueries({ queryKey: ["ams"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  return (
    <AmsShell
      wide
      title={data ? `طلب ${data.application.application_number ?? "بدون رقم"}` : "ملف الطلب"}
      description={data ? `ولي الأمر: ${data.parent?.fullName ?? "—"} · المسؤول: ${data.officerName ?? "غير مُسند"}` : undefined}
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/ams/queue"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground"
          >
            <ArrowRight className="size-3.5" /> القائمة
          </Link>
          <Button
            variant="outline"
            className="rounded-2xl text-xs font-bold"
            onClick={() => pin.mutate(!(data?.pinned ?? false))}
          >
            <Pin className={cn("size-3.5", data?.pinned && "fill-primary text-primary")} /> تثبيت
          </Button>
          <Button variant="outline" className="rounded-2xl text-xs font-bold" onClick={() => window.print()}>
            <Printer className="size-3.5" /> طباعة
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl text-xs font-bold"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
          >
            <Archive className="size-3.5" /> أرشفة
          </Button>
        </div>
      }
    >
      {error ? (
        <EmptyState title="تعذّر فتح الطلب" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={10} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border/60 bg-card px-4 py-3">
            <StatusPill status={data.application.status} />
            <PriorityPill priority={data.application.priority} />
            <span className="text-[11px] font-bold text-muted-foreground">
              رقم الطلب: {data.application.application_number ?? "—"}
            </span>
            <span className="text-[11px] font-bold text-muted-foreground">
              العام الدراسي: {data.application.academic_year}
            </span>
            {data.application.student_number ? (
              <span className="text-[11px] font-bold text-muted-foreground">
                الرقم الأكاديمي: {data.application.student_number}
              </span>
            ) : null}
          </div>
          <InsightBar data={data} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="min-w-0">
              <ApplicantPanel data={data} />
            </div>
            <div className="min-w-0 xl:h-[calc(100dvh-320px)]">
              <TimelinePanel data={data} />
            </div>
            <div className="min-w-0">
              <ActionCenter data={data} />
            </div>
          </div>
        </div>
      )}
    </AmsShell>
  );
}