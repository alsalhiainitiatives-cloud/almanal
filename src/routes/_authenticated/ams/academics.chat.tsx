import { createFileRoute } from "@tanstack/react-router";

import { ClassChat } from "@/features/academics/components/ClassChat";
import { AmsShell } from "@/features/ams/components/AmsShell";

export const Route = createFileRoute("/_authenticated/ams/academics/chat")({
  head: () => ({
    meta: [
      { title: "محادثة الفصل — التتبع الأكاديمي | مدارس وروضة المنال" },
      {
        name: "description",
        content: "قناة تواصل بين معلمة الفصل وأولياء أمور أطفال الفصل نفسه.",
      },
      { property: "og:title", content: "محادثة الفصل — التتبع الأكاديمي" },
      {
        property: "og:description",
        content: "محادثة مباشرة لكل فصل بين المعلمة وأولياء الأمور مع إرفاق الخطط والأنشطة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AmsShell title="محادثة الفصل" description="تواصل مباشر بين المعلمة وأولياء أمور الفصل" wide>
      <ClassChat />
    </AmsShell>
  ),
});
