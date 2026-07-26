import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { ArrowLeft, FilePlus2 } from "lucide-react";

import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { getMyApplications } from "@/features/admissions/application.functions";
import { getAdmissionCatalog } from "@/features/admissions/catalog.functions";
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
    <>
      <PageHero
        eyebrow="بوابة أولياء الأمور"
        title="طلباتي"
        description="تابع حالة كل طلب، أكمل المسودات، واطّلع على الملخص المالي ورقم التتبع."
      >
        <Button asChild variant="hero" size="lg">
          <Link to="/admissions">
            <FilePlus2 className="size-4" />
            طلب قبول جديد
          </Link>
        </Button>
      </PageHero>

      <section className="section-y">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          {apps.length === 0 ? (
            <div className="rounded-[2.5rem] border border-dashed border-border bg-card/60 p-12 text-center">
              <p className="text-lg font-black text-foreground">لا توجد طلبات بعد</p>
              <p className="mt-2 text-sm text-muted-foreground">
                ابدأ رحلة تسجيل طفلك واختر المرحلة المناسبة.
              </p>
              <Button asChild variant="hero" className="mt-6">
                <Link to="/admissions">ابدأ التسجيل</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {apps.map((app) => {
                const stage = catalog.stages.find((s) => s.id === app.stage_id);
                const isDraft = app.status === "draft" || app.status === "needs_action";
                return (
                  <div
                    key={app.id}
                    className="flex flex-col gap-5 rounded-[2rem] bg-card p-7 shadow-soft sm:flex-row sm:items-center sm:justify-between"
                  >
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
                        {app.application_number ?? "مسودة غير مرسلة"}
                        {app.tracking_number ? ` • ${app.tracking_number}` : ""}
                      </p>
                      {Number(app.grand_total) > 0 ? (
                        <p className="mt-2 text-sm font-bold text-primary">
                          الإجمالي التقديري: {Number(app.grand_total).toLocaleString("ar-SA")} ر.س
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {isDraft ? (
                        <Button asChild variant="hero">
                          <Link to="/apply/$applicationId" params={{ applicationId: app.id }}>
                            متابعة الطلب
                            <ArrowLeft className="size-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild variant="soft">
                          <Link to="/track/$applicationId" params={{ applicationId: app.id }}>
                            تتبع الطلب
                            <ArrowLeft className="size-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}