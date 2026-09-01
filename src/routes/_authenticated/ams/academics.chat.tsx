import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";

import { ModulePlaceholder } from "@/features/academics/components/ModulePlaceholder";
import { AmsShell } from "@/features/ams/components/AmsShell";

export const Route = createFileRoute("/_authenticated/ams/academics/chat")({
  head: () => ({
    meta: [
      { title: "محادثة الفصل — التتبع الأكاديمي | مدارس وروضة المنال" },
      {
        name: "description",
        content: "قناة تواصل بين معلمة الفصل وأولياء أمور أطفال الفصل نفسه.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AmsShell title="محادثة الفصل" description="تواصل مباشر بين المعلمة وأولياء أمور الفصل" wide>
      <ModulePlaceholder
        icon={MessagesSquare}
        title="محادثة الفصل"
        description="مساحة محادثة لكل فصل تجمع المعلمة وأولياء الأمور، مع تنبيهات فورية وأرشيف للرسائل."
        bullets={[
          "محادثة لكل فصل بصلاحيات محكمة",
          "إشعارات فورية لولي الأمر",
          "إرفاق صور وملفات الأنشطة",
          "أرشيف قابل للبحث",
        ]}
      />
    </AmsShell>
  ),
});
