import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { FinanceReports } from "@/features/ams/components/finance/FinanceReports";
import { useAuth } from "@/features/auth/AuthProvider";
import { canViewFinance } from "@/features/finance/access";

export const Route = createFileRoute("/_authenticated/ams/finance/reports")({
  head: () => ({
    meta: [
      { title: "التقارير المالية | الإدارة المالية" },
      {
        name: "description",
        content: "تقارير الوضع المالي للروضة: الملخص العام، أعمار المتأخرات، والتحصيل الشهري مع تصدير إكسل وPDF.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinanceReportsPage,
});

function FinanceReportsPage() {
  const { roles } = useAuth();

  return (
    <AmsShell
      title="التقارير المالية"
      description="متابعة الوضع المالي للروضة مع تصدير احترافي بهوية الروضة (إكسل / PDF)"
      wide
    >
      {canViewFinance(roles as string[]) ? (
        <FinanceReports />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم متاح للحسابات والإدارة فقط.</p>
        </div>
      )}
    </AmsShell>
  );
}
