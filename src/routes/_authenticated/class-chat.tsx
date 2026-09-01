import { createFileRoute } from "@tanstack/react-router";

import { ClassChat } from "@/features/academics/components/ClassChat";
import { PortalLayout } from "@/features/auth/components/PortalLayout";

export const Route = createFileRoute("/_authenticated/class-chat")({
  head: () => ({
    meta: [
      { title: "محادثة فصل طفلي | مدارس وروضة المنال" },
      {
        name: "description",
        content: "تواصل مباشر مع معلمة فصل طفلك، ومتابعة الخطط الأسبوعية والأنشطة.",
      },
      { property: "og:title", content: "محادثة فصل طفلي — مدارس وروضة المنال" },
      {
        property: "og:description",
        content: "قناة محادثة خاصة بفصل طفلك مع المعلمة، وإرفاق الخطط والأنشطة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalLayout
      title="محادثة فصل طفلي"
      description="تواصل مباشر مع معلمة الفصل ومتابعة الخطط الأسبوعية"
    >
      <ClassChat />
    </PortalLayout>
  ),
});
