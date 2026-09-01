import { createFileRoute } from "@tanstack/react-router";

import { canManageAcademics } from "@/features/academics/academics";
import { TeacherAssignments } from "@/features/academics/components/TeacherAssignments";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/academics/assignments")({
  head: () => ({
    meta: [
      { title: "إسناد المعلمات — التتبع الأكاديمي | مدارس وروضة المنال" },
      { name: "description", content: "ربط كل معلمة بفصولها ومواد المنهج التي ترصدها." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const { roles } = useAuth();

  return (
    <AmsShell title="إسناد المعلمات" description="ربط كل معلمة بفصولها ومسؤولياتها الأكاديمية" wide>
      {canManageAcademics(roles) ? (
        <TeacherAssignments />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم متاح للمدير العام فقط.</p>
        </div>
      )}
    </AmsShell>
  );
}
