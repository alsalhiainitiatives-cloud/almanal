import { createFileRoute } from "@tanstack/react-router";

import { canViewAcademics } from "@/features/academics/academics";
import { ClassCalendar } from "@/features/academics/components/ClassCalendar";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/academics/calendar")({
  head: () => ({
    meta: [
      { title: "تقويم الفصل — التتبع الأكاديمي | مدارس وروضة المنال" },
      {
        name: "description",
        content:
          "تقويم شهري واحد يجمع دروس الخطة الأسبوعية ومحادثات الفصل والتقييمات لكل فصل دراسي.",
      },
      { property: "og:title", content: "تقويم الفصل — مدارس وروضة المنال" },
      {
        property: "og:description",
        content: "عرض تقويمي موحّد للخطط الدراسية والمحادثات والتقييمات.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { roles } = useAuth();

  return (
    <AmsShell
      title="تقويم الفصل"
      description="الخطط الدراسية والمحادثات والتقييمات في تقويم شهري واحد"
      wide
    >
      {canViewAcademics(roles) ? (
        <ClassCalendar />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم غير متاح لصلاحيتك.</p>
        </div>
      )}
    </AmsShell>
  );
}
