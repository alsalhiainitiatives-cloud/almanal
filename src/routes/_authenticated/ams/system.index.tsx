import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarClock,
  HardDrive,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";
import { P } from "@/features/auth/rbac";

export const Route = createFileRoute("/_authenticated/ams/system/")({
  head: () => ({
    meta: [
      { title: "إعدادات النظام — مدارس وروضة المنال" },
      {
        name: "description",
        content: "المستخدمون والأدوار ومصفوفة الصلاحيات وسجل العمليات وإعدادات المنصة الأساسية.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SystemHome,
});

const CARDS = [
  {
    to: "/ams/system/users",
    label: "المستخدمون والأدوار",
    icon: Users,
    text: "حسابات البوابة وتوزيع الأدوار والاستثناءات الفردية.",
  },
  {
    to: "/ams/system/permissions",
    label: "مصفوفة الصلاحيات",
    icon: KeyRound,
    text: "تحكم دقيق في صلاحيات كل دور داخل المنصة.",
  },
  {
    to: "/ams/system/audit",
    label: "سجل العمليات",
    icon: ShieldCheck,
    text: "تتبّع كل تغيير حسّاس مع الجهاز وعنوان الإنترنت.",
  },
  {
    to: "/ams/system/storage",
    label: "التخزين والصيانة",
    icon: HardDrive,
    text: "متابعة مساحة المرفقات وتنظيف الملفات غير المرتبطة.",
  },
  {
    to: "/ams/seasons",
    label: "مواسم التسجيل",
    icon: CalendarClock,
    text: "فتح وإغلاق مواسم القبول وربطها بالعام الدراسي.",
  },
  {
    to: "/ams/form-builder",
    label: "تخصيص نظام التسجيل",
    icon: SlidersHorizontal,
    text: "خطوات نموذج التسجيل وحقوله وخدماته الإضافية.",
  },
  {
    to: "/ams/finance/settings",
    label: "الإعدادات المالية",
    icon: Wallet,
    text: "الرسوم وخطط السداد والحسابات البنكية وسياسات الخصم.",
  },
  {
    to: "/ams/academics/settings",
    label: "إعدادات التتبع الأكاديمي",
    icon: BookOpen,
    text: "معايير التقييم وإعدادات المنهج والخطط الدراسية والتقارير.",
  },
] as const;

function SystemHome() {
  const { hasPermission } = useAuth();
  const allowed = hasPermission(P.usersView) || hasPermission(P.settingsManage);

  if (!allowed) {
    return (
      <AmsShell title="إعدادات النظام">
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم غير متاح لصلاحيتك.</p>
        </div>
      </AmsShell>
    );
  }

  return (
    <AmsShell
      title="إعدادات النظام"
      description="المستخدمون والصلاحيات والحوكمة وإعدادات المنصة الأساسية"
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((card) => (
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
