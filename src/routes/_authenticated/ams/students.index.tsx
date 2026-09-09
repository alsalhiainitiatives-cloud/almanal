import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Armchair,
  Award,
  CalendarCheck,
  FileSpreadsheet,
  GraduationCap,
  Link2,
  LogOut,
  UserRoundPlus,
} from "lucide-react";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { canSeeLink } from "@/features/ams/nav-access";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/students/")({
  head: () => ({
    meta: [
      { title: "لوحة شؤون الطلاب | مدارس وروضة المنال" },
      {
        name: "description",
        content:
          "لوحة شؤون الطلاب: سجل الطلاب، الفصول والمقاعد، الحضور والغياب، ربط أولياء الأمور، استيراد وتصدير البيانات، ونقل المراحل.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentsHome,
});

const CARDS = [
  {
    to: "/ams/students/registry",
    label: "سجل الطلاب",
    icon: GraduationCap,
    text: "قائمة الطلاب المقبولين وملفاتهم الرسمية القابلة للطباعة والتقديم عند النقل.",
  },
  {
    to: "/ams/seats",
    label: "الفصول والمقاعد",
    icon: Armchair,
    text: "توزيع الطلاب على الفصول، متابعة الإشغال، والسعة المتاحة لكل مرحلة.",
  },
  {
    to: "/ams/students/attendance",
    label: "الحضور والغياب",
    icon: CalendarCheck,
    text: "تحضير يومي لكل فصل مع النسب الشهرية، ويظهر ملخّصه في تقويم الفصل.",
  },
  {
    to: "/ams/students/certificates",
    label: "شهادات الطلاب",
    icon: Award,
    text: "إصدار شهادات تشجيعية لنهاية العام بهوية المدرسة وبيانات الطالب الحقيقية.",
  },
  {
    to: "/ams/students/guardians",
    label: "ربط أولياء الأمور",
    icon: Link2,
    text: "دعوة أولياء أمور الطلاب المستوردين لإنشاء حساب وربط جميع أبنائهم تلقائيًا.",
  },
  {
    to: "/ams/students/data",
    label: "استيراد وتصدير الطلاب",
    icon: FileSpreadsheet,
    text: "نموذج إكسل جاهز، استيراد الطلاب السابقين بمراجعة مسبقة، إضافة وتعديل وحذف، وتصدير إكسل / CSV / PDF.",
  },
  {
    to: "/ams/students/withdrawals",
    label: "انسحاب الطلاب والخريجون",
    icon: LogOut,
    text: "طلبات الانسحاب والتخرّج، تسوية المستحقات المالية، وشهادة مدة الالتحاق والمواد المدروسة.",
  },
  {
    to: "/ams/students/promotions",
    label: "نقل الطلاب بين المراحل",
    icon: UserRoundPlus,
    text: "ترقية الطلاب للعام الدراسي الجديد حسب العمر والمرحلة، فرديًا أو جماعيًا.",
  },
] as const;


function StudentsHome() {
  const { roles, permissions } = useAuth();
  const cards = CARDS.filter((card) => canSeeLink(card.to, roles as string[], permissions));

  return (
    <AmsShell
      title="لوحة شؤون الطلاب"
      description="كل أقسام شؤون الطلاب في مكان واحد — السجل، الفصول، بيانات الطلاب، ونقل المراحل"
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
