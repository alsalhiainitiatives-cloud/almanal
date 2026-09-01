import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

import { ModulePlaceholder } from "@/features/academics/components/ModulePlaceholder";
import { canManageAcademics } from "@/features/academics/academics";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/academics/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات التتبع الأكاديمي | مدارس وروضة المنال" },
      { name: "description", content: "إعدادات مقاييس التقييم ودورات الرصد للتتبع الأكاديمي." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcademicsSettingsPage,
});

function AcademicsSettingsPage() {
  const { roles } = useAuth();

  return (
    <AmsShell title="إعدادات التتبع الأكاديمي" description="مقاييس التقييم ودورات الرصد" wide>
      {canManageAcademics(roles) ? (
        <ModulePlaceholder
          icon={Settings}
          title="الإعدادات"
          description="تحكم كامل في مقاييس الإتقان، دورات الرصد الأسبوعية أو الشهرية، ومن يرى التقارير."
          bullets={[
            "مقاييس الإتقان ومسمياتها",
            "دورية الرصد",
            "صلاحيات ظهور التقارير",
            "قوالب التقارير",
          ]}
        />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">الإعدادات متاحة لمدير النظام فقط.</p>
        </div>
      )}
    </AmsShell>
  );
}
