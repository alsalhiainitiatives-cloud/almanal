import { createFileRoute } from "@tanstack/react-router";

import { canViewAcademics } from "@/features/academics/academics";
import { StudyPlanBuilder } from "@/features/academics/components/StudyPlanBuilder";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/academics/plans")({
  head: () => ({
    meta: [
      { title: "الخطط الدراسية — التتبع الأكاديمي | مدارس وروضة المنال" },
      {
        name: "description",
        content: "بناء الخطط الأسبوعية والشهرية بالسحب والإفلات ومشاركتها مع أولياء الأمور.",
      },
      { property: "og:title", content: "الخطط الدراسية — مدارس وروضة المنال" },
      {
        property: "og:description",
        content: "منظّم الخطط الدراسية للفصول مع التصدير والمشاركة في محادثة الفصل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { roles } = useAuth();

  return (
    <AmsShell
      title="الخطط الدراسية"
      description="اسحب دروس المنهج إلى أيام الأسبوع، ثم صدّر الخطة أو شاركها في محادثة الفصل"
      wide
    >
      {canViewAcademics(roles) ? (
        <StudyPlanBuilder />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم غير متاح لصلاحيتك.</p>
        </div>
      )}
    </AmsShell>
  );
}
