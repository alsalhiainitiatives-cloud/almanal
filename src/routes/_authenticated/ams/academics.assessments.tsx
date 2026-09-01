import { createFileRoute } from "@tanstack/react-router";

import { AssessmentsBoard } from "@/features/academics/components/AssessmentsBoard";
import { canEditCurriculum } from "@/features/academics/academics";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/academics/assessments")({
  head: () => ({
    meta: [
      { title: "التقييمات — التتبع الأكاديمي | مدارس وروضة المنال" },
      { name: "description", content: "رصد إتقان الطفل لكل درس ومهارة داخل المنهج." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentsPage,
});

function AssessmentsPage() {
  const { roles } = useAuth();

  if (!canEditCurriculum(roles)) {
    return (
      <AmsShell title="التقييمات">
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
      title="التقييمات"
      description="الأطفال في الصفوف والدروس في الأعمدة — اضغطي على المثلث لتغيير مستوى الأداء أو النمو"
      wide
    >
      <AssessmentsBoard />
    </AmsShell>
  );
}
