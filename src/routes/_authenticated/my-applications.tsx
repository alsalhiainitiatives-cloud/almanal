import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, FilePlus2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { ReservationBanner } from "@/features/admissions/components/ReservationBanner";
import {
  deleteDraftApplicationFn,
  getMyApplications,
} from "@/features/admissions/application.functions";
import { getAdmissionCatalog } from "@/features/admissions/catalog.functions";
import { ApplicationStepper } from "@/features/admissions/components/ApplicationJourney";
import {
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
} from "@/features/admissions/eligibility";

export const Route = createFileRoute("/_authenticated/my-applications")({
  head: () => ({
    meta: [
      { title: "طلباتي | مدارس وروضة المنال" },
      { name: "description", content: "تابع حالة طلبات القبول الخاصة بأبنائك في مدارس وروضة المنال." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyApplicationsPage,
});

function MyApplicationsPage() {
  const fetchApps = useServerFn(getMyApplications);
  const fetchCatalog = useServerFn(getAdmissionCatalog);
  const deleteDraft = useServerFn(deleteDraftApplicationFn);
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, isDraftRow: boolean) {
    setDeletingId(id);
    try {
      await deleteDraft({ data: id });
      await queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      toast.success(isDraftRow ? "تم حذف المسودة وجميع بياناتها نهائيًا" : "تم حذف الطلب وجميع بياناته نهائيًا");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حذف الطلب");
    } finally {
      setDeletingId(null);
    }
  }

  const appsQuery = useMemo(
    () => queryOptions({ queryKey: ["my-applications"], queryFn: () => fetchApps() }),
    [fetchApps],
  );
  const catalogQuery = useMemo(
    () => queryOptions({ queryKey: ["admissions", "catalog"], queryFn: () => fetchCatalog() }),
    [fetchCatalog],
  );

  const { data: apps } = useSuspenseQuery(appsQuery);
  const { data: catalog } = useSuspenseQuery(catalogQuery);

  return (
    <PortalLayout
      title="طلباتي وتتبع الطلب"
      description="تابع حالة كل طلب خطوة بخطوة، أكمل المسودات، واطّلع على الملخص المالي ورقم الطلب."
    >
      <div className="flex justify-end">
        <Button asChild variant="hero">
          <Link to="/admissions">
            <FilePlus2 className="size-4" />
            طلب قبول جديد
          </Link>
        </Button>
      </div>

      <ReservationBanner />

      <div>
        {apps.length === 0 ? (
            <div className="rounded-[2.5rem] border border-dashed border-border bg-card/60 p-12 text-center">
              <p className="text-lg font-black text-foreground">لا توجد طلبات بعد</p>
              <p className="mt-2 text-sm text-muted-foreground">
                ابدأ رحلة تسجيل طفلك واختر المرحلة المناسبة.
              </p>
              <Button asChild variant="hero" className="mt-6">
                <Link to="/apply/new">ابدأ التسجيل</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {apps.map((app) => {
                const stage = catalog.stages.find((s) => s.id === app.stage_id);
                const isDraft = app.status === "draft" || app.status === "needs_action";
                const withdrawn = app.status === "withdrawn";
                const canDelete =
                  app.status === "draft" || app.status === "withdrawn" || app.status === "rejected";
                const deleteBlock = canDelete ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deletingId === app.id}
                        aria-label={app.status === "draft" ? "حذف المسودة" : "حذف الطلب"}
                      >
                        {deletingId === app.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        حذف
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl" className="text-right">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                          {app.status === "draft"
                            ? "تحذير: حذف المسودة نهائيًا"
                            : "تحذير: حذف الطلب نهائيًا"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="leading-relaxed">
                          سيتم حذف هذا الطلب وكل ما أدخلته فيه: بيانات ولي الأمر، بيانات الأبناء،
                          الخدمات المختارة، والمستندات المرفوعة، إضافة إلى تحرير أي مقعد محجوز.
                          ستفقد كل تقدمك وسجل التتبع ولا يمكن استرجاع هذه البيانات لاحقًا.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
                        <AlertDialogAction
                          onClick={() => handleDelete(app.id, app.status === "draft")}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          نعم، احذف نهائيًا
                        </AlertDialogAction>
                        <AlertDialogCancel>تراجع</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null;
                return (
                  <div
                    key={app.id}
                    className={`rounded-[2rem] p-7 shadow-soft ${
                      withdrawn ? "border border-destructive/30 bg-destructive/5" : "bg-card"
                    }`}
                  >
                   <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            APPLICATION_STATUS_COLORS[app.status] ?? "bg-beige text-foreground"
                          }`}
                        >
                          {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                        </span>
                        <p className="font-black text-foreground">{stage?.name_ar ?? "طلب قبول"}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground" dir="ltr">
                        {app.application_number ?? app.tracking_number ?? "مسودة غير مرسلة"}
                      </p>
                      {Number(app.grand_total) > 0 ? (
                        <p className="mt-2 text-sm font-bold text-primary">
                          الإجمالي التقديري: {Number(app.grand_total).toLocaleString("ar-SA")} ر.س
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isDraft && !withdrawn ? (
                        <>
                          <Button asChild variant="hero">
                            <Link to="/apply/$applicationId" params={{ applicationId: app.id }}>
                              متابعة الطلب
                              <ArrowLeft className="size-4" />
                            </Link>
                          </Button>
                          {deleteBlock}
                        </>
                      ) : (
                        <>
                          {app.status === "approved" ? (
                            <Button asChild variant="hero">
                              <Link to="/payments">
                                المصروفات الدراسية
                                <ArrowLeft className="size-4" />
                              </Link>
                            </Button>
                          ) : null}
                          <Button asChild variant="soft">
                            <Link to="/track/$applicationId" params={{ applicationId: app.id }}>
                              تتبع الطلب
                              <ArrowLeft className="size-4" />
                            </Link>
                          </Button>
                          {deleteBlock}
                        </>
                      )}
                    </div>
                   </div>
                   <div className="mt-6 border-t border-border/60 pt-5">
                     <ApplicationStepper status={app.status} />
                   </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </PortalLayout>
  );
}