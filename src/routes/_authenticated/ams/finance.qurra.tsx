import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { QurraBoard } from "@/features/ams/components/finance/QurraBoard";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageFinance, canViewFinance } from "@/features/finance/access";

export const Route = createFileRoute("/_authenticated/ams/finance/qurra")({
  head: () => ({
    meta: [
      { title: "متابعة سداد مبادرة قرة | الإدارة المالية" },
      {
        name: "description",
        content: "جدول شهري لمتابعة المبالغ المحوّلة من مبادرة قرة والمبالغ المستحقة لكل طالب مشمول بالدعم.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinanceQurraPage,
});

function FinanceQurraPage() {
  const { roles } = useAuth();
  const list = roles as string[];

  return (
    <AmsShell
      title="متابعة سداد مبادرة قرة"
      description="جدول شهري لكل طالب مشمول بالدعم: المبلغ المحوّل من قرة، المبلغ المستحق، وتأكيد السداد"
      wide
    >
      {canViewFinance(list) ? (
        <QurraBoard canManage={canManageFinance(list)} />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم متاح للحسابات والإدارة فقط.</p>
        </div>
      )}
    </AmsShell>
  );
}
