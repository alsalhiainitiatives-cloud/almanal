import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  MessagesSquare,
  Settings,
  UsersRound,
} from "lucide-react";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { ACADEMIC_ROLE_LABELS, academicRole, canViewAcademics } from "@/features/academics/academics";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/academics/")({
  head: () => ({
    meta: [
      { title: "التتبع الأكاديمي — مدارس وروضة المنال" },
      {
        name: "description",
        content: "منصة التتبع الأكاديمي: المنهج، إسناد المعلمات، التقييمات، والتقارير الأكاديمية.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcademicsHome,
});

const CARDS = [
  {
    to: "/ams/academics/chat",
    label: "محادثة الفصل",
    icon: MessagesSquare,
    text: "تواصل مباشر بين المعلمة وأولياء أمور الفصل.",
  },
  {
    to: "/ams/academics/curriculum",
    label: "إدارة المنهج",
    icon: BookOpen,
    text: "المواد والمحاور والدروس لكل فصل — جاهزة للاستخدام.",
    ready: true,
  },
  {
    to: "/ams/academics/plans",
    label: "الخطط الدراسية",
    icon: CalendarRange,
    text: "خطط أسبوعية وشهرية بالسحب والإفلات، مع تصدير ومشاركة في محادثة الفصل.",
    ready: true,
  },
  {
    to: "/ams/academics/assignments",
    label: "إسناد المعلمات",
    icon: UsersRound,
    text: "ربط كل معلمة بفصولها ومسؤولياتها الأكاديمية.",
  },
  {
    to: "/ams/academics/assessments",
    label: "التقييمات",
    icon: ClipboardCheck,
    text: "جدول رصد بالمثلثات الملوّنة مع الأدلة الرقمية لكل درس.",
    ready: true,
  },
  {
    to: "/ams/academics/reports",
    label: "التقارير الأكاديمية",
    icon: BarChart3,
    text: "تقارير التقدم للفصل والطفل وولي الأمر.",
  },
  {
    to: "/ams/academics/settings",
    label: "الإعدادات",
    icon: Settings,
    text: "إعدادات مقاييس التقييم ودورات الرصد.",
  },
] as const;

function AcademicsHome() {
  const { roles } = useAuth();

  if (!canViewAcademics(roles)) {
    return (
      <AmsShell title="التتبع الأكاديمي">
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم غير متاح لصلاحيتك.</p>
        </div>
      </AmsShell>
    );
  }

  return (
    <AmsShell
      title="التتبع الأكاديمي"
      description={`صلاحيتك الحالية: ${ACADEMIC_ROLE_LABELS[academicRole(roles)]} — المنهج والتقييمات والتقارير في مكان واحد`}
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
            <div className="mt-4 flex items-center gap-2">
              <h2 className="text-sm font-black text-foreground">{card.label}</h2>
              {"ready" in card && card.ready ? (
                <span className="rounded-full bg-mint/60 px-2 py-0.5 text-[10px] font-black text-foreground">
                  جاهز
                </span>
              ) : (
                <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[10px] font-black text-foreground">
                  قريبًا
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.text}</p>
          </Link>
        ))}
      </div>
    </AmsShell>
  );
}
