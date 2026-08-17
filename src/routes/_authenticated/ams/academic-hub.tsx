import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";
import { TeacherHub } from "@/features/journey/components/TeacherHub";

export const Route = createFileRoute("/_authenticated/ams/academic-hub")({
  head: () => ({
    meta: [
      { title: "المسار الأكاديمي والأنشطة | مدارس وروضة المنال" },
      {
        name: "description",
        content: "الخطط الأسبوعية ورصد المهارات والأدلة الرقمية لأطفال الفصل.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcademicHubPage,
});

function AcademicHubPage() {
  const { roles } = useAuth();
  const list = roles as string[];
  const canView = list.some((r) =>
    ["teacher", "admin", "supervisor", "principal", "registration_officer"].includes(r),
  );

  return (
    <AmsShell
      title="المسار الأكاديمي والأنشطة"
      description="الخطة الأسبوعية، رصد المهارات، والأدلة الرقمية لكل طفل في فصلك"
      wide
    >
      {canView ? (
        <TeacherHub />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم متاح للمعلمات وإدارة المدرسة فقط.</p>
        </div>
      )}
    </AmsShell>
  );
}