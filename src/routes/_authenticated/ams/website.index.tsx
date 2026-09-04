import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Globe, MessagesSquare, Star } from "lucide-react";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { canSeeLink } from "@/features/ams/nav-access";
import { useAuth } from "@/features/auth/AuthProvider";
import { P } from "@/features/auth/rbac";

export const Route = createFileRoute("/_authenticated/ams/website/")({
  head: () => ({
    meta: [
      { title: "الموقع الإلكتروني — مدارس وروضة المنال" },
      {
        name: "description",
        content: "إدارة محتوى الموقع العام والمراسلات والتقييمات واستبانات أولياء الأمور.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteHome,
});

const CARDS = [
  {
    to: "/ams/website/settings",
    label: "إعدادات الموقع",
    icon: Globe,
    text: "الهوية والشعار والهيرو ومحتوى الصفحات والسياسات القانونية.",
  },
  {
    to: "/ams/website/inbox",
    label: "المراسلات الواردة",
    icon: MessagesSquare,
    text: "رسائل نموذج التواصل مع الردود والحالات والتصدير.",
  },
  {
    to: "/ams/website/reviews",
    label: "التقييمات والتعليقات",
    icon: Star,
    text: "مراجعة آراء أولياء الأمور قبل نشرها في الموقع.",
  },
  {
    to: "/ams/website/surveys",
    label: "الاستبانات ",
    icon: ClipboardList,
    text: "صمّم استبانات ديناميكية، تابع المشاركة، وحلّل صوت أولياء الأمور.",
  },
] as const;

function WebsiteHome() {
  const { hasPermission, roles, permissions } = useAuth();
  const cards = CARDS.filter((card) => canSeeLink(card.to, roles as string[], permissions));
  const allowed = cards.length > 0 || hasPermission(P.settingsManage) || hasPermission(P.applicationsReview);

  if (!allowed) {
    return (
      <AmsShell title="الموقع الإلكتروني">
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم غير متاح لصلاحيتك.</p>
        </div>
      </AmsShell>
    );
  }

  return (
    <AmsShell
      title="الموقع الإلكتروني"
      description="محتوى الموقع العام والمراسلات والتقييمات في مكان واحد"
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
