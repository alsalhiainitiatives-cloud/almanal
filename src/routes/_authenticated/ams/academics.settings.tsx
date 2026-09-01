import { createFileRoute } from "@tanstack/react-router";

import { AcademicsSettingsPanel } from "@/features/academics/components/AcademicsSettingsPanel";
import { canManageAcademics } from "@/features/academics/academics";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/academics/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات التتبع الأكاديمي | مدارس وروضة المنال" },
      { name: "description", content: "إعدادات ألوان الأشهر وتشغيل محادثة الفصول للتتبع الأكاديمي." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcademicsSettingsPage,
});

function AcademicsSettingsPage() {
  const { roles } = useAuth();

  return (
    <AmsShell
      title="إعدادات التتبع الأكاديمي"
      description="ألوان الأشهر المستخدمة في المثلثات، وتشغيل/إيقاف محادثة الفصول"
      wide
    >
      {canManageAcademics(roles) ? (
        <AcademicsSettingsPanel />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">الإعدادات متاحة لمدير النظام فقط.</p>
        </div>
      )}
    </AmsShell>
  );
}
