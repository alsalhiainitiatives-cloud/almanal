import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { ClaimsBoard } from "@/features/ams/components/finance/ClaimsBoard";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageFinance, canViewFinance } from "@/features/finance/access";

export const Route = createFileRoute("/_authenticated/ams/finance/claims")({
  head: () => ({
    meta: [
      { title: "المطالبات المالية السنوية | الإدارة المالية" },
      {
        name: "description",
        content: "إصدار المطالبات المالية للعام الدراسي الجديد للطلاب المستمرين ومتابعتها.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinanceClaimsPage,
});

function FinanceClaimsPage() {
  const { roles } = useAuth();
  const list = roles as string[];

  return (
    <AmsShell
      title="المطالبات المالية السنوية"
      description="إصدار مطالبة العام الدراسي الجديد للطلاب المستمرين وإشعار أولياء الأمور"
      wide
    >
      {canViewFinance(list) ? (
        <ClaimsBoard canManage={canManageFinance(list)} />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم متاح للحسابات والإدارة فقط.</p>
        </div>
      )}
    </AmsShell>
  );
}
