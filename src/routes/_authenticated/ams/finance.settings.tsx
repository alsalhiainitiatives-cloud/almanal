import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { FinanceSettings } from "@/features/ams/components/finance/FinanceSettings";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageFinance } from "@/features/finance/access";

export const Route = createFileRoute("/_authenticated/ams/finance/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات المالية | الإدارة المالية" },
      {
        name: "description",
        content: "خطط الرسوم، الخدمات الإضافية، الخصومات، وبيانات الحساب البنكي المعتمدة للروضة.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinanceSettingsPage,
});

function FinanceSettingsPage() {
  const { roles } = useAuth();

  return (
    <AmsShell
      title="الإعدادات المالية"
      description="خطط الرسوم والخدمات والخصومات وبيانات الحساب البنكي"
      wide
    >
      {canManageFinance(roles as string[]) ? (
        <FinanceSettings />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">
            تعديل الإعدادات المالية متاح للحسابات والمدير العام فقط.
          </p>
        </div>
      )}
    </AmsShell>
  );
}
