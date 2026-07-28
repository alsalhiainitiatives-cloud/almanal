import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { FinanceBoard } from "@/features/ams/components/finance/FinanceBoard";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/finance")({
  head: () => ({
    meta: [
      { title: "الإدارة المالية | نظام إدارة القبول" },
      {
        name: "description",
        content: "متابعة الفواتير وجدولة الدفعات واعتماد إيصالات السداد وتذكير أولياء الأمور.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AmsFinancePage,
});

function AmsFinancePage() {
  const { roles } = useAuth();
  const list = roles as string[];
  const canView = list.some((r) =>
    ["accountant", "admin", "principal", "supervisor", "registration_officer"].includes(r),
  );
  const canManage = list.some((r) => ["accountant", "admin"].includes(r));

  return (
    <AmsShell
      title="الإدارة المالية"
      description="الفواتير، جدولة الدفعات، اعتماد الإيصالات، وتذكير أولياء الأمور بالمستحقات"
      wide
    >
      {canView ? (
        <FinanceBoard canManage={canManage} />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم متاح للحسابات والإدارة فقط.</p>
        </div>
      )}
    </AmsShell>
  );
}