import { createFileRoute, Link } from "@tanstack/react-router";
import { Armchair, FileSpreadsheet, GraduationCap, UserRoundPlus } from "lucide-react";

import { AmsShell } from "@/features/ams/components/AmsShell";

export const Route = createFileRoute("/_authenticated/ams/students/")({
  head: () => ({
    meta: [
      { title: "لوحة شؤون الطلاب | مدارس وروضة المنال" },
      {
        name: "description",
        content: "لوحة شؤون الطلاب: سجل الطلاب، الفصول والمقاعد، استيراد وتصدير البيانات، ونقل المراحل.",
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
    to: "/ams/students/data",
    label: "استيراد وتصدير الطلاب",
    icon: FileSpreadsheet,
    text: "نموذج إكسل جاهز، استيراد الطلاب السابقين بمراجعة مسبقة، إضافة وتعديل وحذف، وتصدير إكسل / CSV / PDF.",
  },
  {
    to: "/ams/students/promotions",
    label: "نقل الطلاب بين المراحل",
    icon: UserRoundPlus,
    text: "ترقية الطلاب للعام الدراسي الجديد حسب العمر والمرحلة، فرديًا أو جماعيًا.",
  },
] as const;

function StudentsHome() {
  return (
    <AmsShell
      title="لوحة شؤون الطلاب"
      description="كل أقسام شؤون الطلاب في مكان واحد — السجل، الفصول، بيانات الطلاب، ونقل المراحل"
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
