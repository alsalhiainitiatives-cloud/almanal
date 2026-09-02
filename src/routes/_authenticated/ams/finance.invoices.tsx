import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { FinanceBoard } from "@/features/ams/components/finance/FinanceBoard";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageFinance, canViewFinance } from "@/features/finance/access";

export const Route = createFileRoute("/_authenticated/ams/finance/invoices")({
  head: () => ({
    meta: [
      { title: "متابعة الفواتير والدفعات | الإدارة المالية" },
      {
        name: "description",
        content: "متابعة خطط السداد وجدول الدفعات واعتماد إيصالات السداد وتذكير أولياء الأمور.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinanceInvoicesPage,
});

function FinanceInvoicesPage() {
  const { roles } = useAuth();
  const list = roles as string[];

  return (
    <AmsShell
      title="متابعة الفواتير والدفعات"
      description="خطط السداد، جدول الدفعات، اعتماد الإيصالات، والتذكير عبر واتساب"
      wide
    >
      {canViewFinance(list) ? (
        <FinanceBoard canManage={canManageFinance(list)} />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم متاح للحسابات والإدارة فقط.</p>
        </div>
      )}
    </AmsShell>
  );
}
