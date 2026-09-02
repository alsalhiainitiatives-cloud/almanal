import { createFileRoute } from "@tanstack/react-router";

import { UsersBoard } from "@/features/admin/components/UsersBoard";
import { AmsShell } from "@/features/ams/components/AmsShell";

export const Route = createFileRoute("/_authenticated/ams/system/users")({
  head: () => ({
    meta: [
      { title: "المستخدمون والأدوار | مدارس وروضة المنال" },
      { name: "description", content: "إدارة حسابات البوابة وتوزيع الأدوار والصلاحيات بشكل آمن." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AmsShell
      title="المستخدمون والأدوار"
      description="كل تغيير يُسجَّل في سجل العمليات مع الجهاز وعنوان الإنترنت"
      wide
    >
      <UsersBoard />
    </AmsShell>
  ),
});
