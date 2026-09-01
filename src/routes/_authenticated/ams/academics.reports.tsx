import { createFileRoute } from "@tanstack/react-router";

import { AcademicReports } from "@/features/academics/components/AcademicReports";
import { canEditCurriculum } from "@/features/academics/academics";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/academics/reports")({
  head: () => ({
    meta: [
      { title: "التقارير الأكاديمية — التتبع الأكاديمي | مدارس وروضة المنال" },
      { name: "description", content: "تقارير تقدم الطفل والفصل قابلة للطباعة والمشاركة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcademicReportsPage,
});

function AcademicReportsPage() {
  const { roles } = useAuth();

  if (!canEditCurriculum(roles)) {
    return (
      <AmsShell title="التقارير الأكاديمية">
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">
            هذا القسم متاح للمعلمات وإدارة المدرسة فقط.
          </p>
        </div>
      </AmsShell>
    );
  }

  return (
    <AmsShell
      title="التقارير الأكاديمية"
      description="تقرير جاهز للطباعة يعرض حالة المثلثات وألوانها والأدلة الرقمية لكل درس"
      wide
    >
      <AcademicReports />
    </AmsShell>
  );
}
