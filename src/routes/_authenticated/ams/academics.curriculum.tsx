import { createFileRoute } from "@tanstack/react-router";

import { CurriculumManager } from "@/features/academics/components/CurriculumManager";
import { canViewAcademics } from "@/features/academics/academics";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/academics/curriculum")({
  head: () => ({
    meta: [
      { title: "إدارة المنهج — التتبع الأكاديمي | مدارس وروضة المنال" },
      {
        name: "description",
        content: "بناء المنهج لكل فصل: المواد ثم المحاور ثم الدروس مع التفعيل والألوان.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CurriculumPage,
});

function CurriculumPage() {
  const { roles } = useAuth();

  return (
    <AmsShell
      title="إدارة المنهج"
      description="المنهج مرتّب هرميًا: مادة ← محور ← درس — لكل فصل على حدة"
      wide
    >
      {canViewAcademics(roles) ? (
        <CurriculumManager />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم غير متاح لصلاحيتك.</p>
        </div>
      )}
    </AmsShell>
  );
}
