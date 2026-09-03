import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ReceiptText, Settings2, Wallet } from "lucide-react";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { canSeeLink } from "@/features/ams/nav-access";
import { useAuth } from "@/features/auth/AuthProvider";
import { canManageFinance, canViewFinance } from "@/features/finance/access";

export const Route = createFileRoute("/_authenticated/ams/finance/")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة المالية | مدارس وروضة المنال" },
      {
        name: "description",
        content: "لوحة الإدارة المالية: الفواتير والدفعات، المطالبات السنوية، التقارير المالية والإعدادات.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinanceHome,
});

const CARDS = [
  {
    to: "/ams/finance/invoices",
    label: "متابعة الفواتير والدفعات",
    icon: Wallet,
    text: "خطط السداد، جدول الدفعات، اعتماد الإيصالات، وتذكير أولياء الأمور.",
    manage: false,
  },
  {
    to: "/ams/finance/claims",
    label: "المطالبات المالية السنوية",
    icon: ReceiptText,
    text: "إصدار مطالبة العام الدراسي الجديد للطلاب المستمرين.",
    manage: true,
  },
  {
    to: "/ams/finance/reports",
    label: "التقارير المالية",
    icon: BarChart3,
    text: "ملخص مالي، أعمار المتأخرات، والتحصيل الشهري مع تصدير إكسل وPDF بهوية الروضة.",
    manage: false,
  },
  {
    to: "/ams/finance/settings",
    label: "الإعدادات المالية",
    icon: Settings2,
    text: "خطط الرسوم، الخدمات، الخصومات، وبيانات الحساب البنكي.",
    manage: true,
  },
] as const;

function FinanceHome() {
  const { roles } = useAuth();
  const list = roles as string[];

  if (!canViewFinance(list)) {
    return (
      <AmsShell title="الإدارة المالية">
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم متاح للحسابات والإدارة فقط.</p>
        </div>
      </AmsShell>
    );
  }

  const manage = canManageFinance(list);
  const cards = CARDS.filter((c) => !c.manage || manage);

  return (
    <AmsShell
      title="لوحة الإدارة المالية"
      description="كل أقسام النظام المالي في مكان واحد — المتابعة، المطالبات، التقارير، والإعدادات"
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <card.icon className="size-6" />
            </span>
            <h2 className="mt-4 text-sm font-black text-foreground">{card.label}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.text}</p>
          </Link>
        ))}
      </div>
    </AmsShell>
  );
}
