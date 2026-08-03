import { createFileRoute } from "@tanstack/react-router";
import { Settings2, Wallet } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { FinanceBoard } from "@/features/ams/components/finance/FinanceBoard";
import { FinanceSettings } from "@/features/ams/components/finance/FinanceSettings";
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
      description="الفواتير، جدولة الدفعات، اعتماد الإيصالات، وإعدادات الرسوم والخدمات والحساب البنكي"
      wide
    >
      {canView ? (
        <Tabs defaultValue="board" dir="rtl" className="space-y-5">
          <TabsList className="rounded-2xl">
            <TabsTrigger value="board" className="rounded-xl text-xs font-bold">
              <Wallet className="ms-1 size-4" /> متابعة الفواتير والدفعات
            </TabsTrigger>
            {canManage ? (
              <TabsTrigger value="settings" className="rounded-xl text-xs font-bold">
                <Settings2 className="ms-1 size-4" /> الإعدادات المالية
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="board" className="m-0">
            <FinanceBoard canManage={canManage} />
          </TabsContent>

          {canManage ? (
            <TabsContent value="settings" className="m-0">
              <FinanceSettings />
            </TabsContent>
          ) : null}
        </Tabs>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم متاح للحسابات والإدارة فقط.</p>
        </div>
      )}
    </AmsShell>
  );
}