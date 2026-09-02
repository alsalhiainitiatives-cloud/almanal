import { createFileRoute } from "@tanstack/react-router";

import { AuditBoard } from "@/features/admin/components/AuditBoard";
import { AmsShell } from "@/features/ams/components/AmsShell";

export const Route = createFileRoute("/_authenticated/ams/system/audit")({
  head: () => ({
    meta: [
      { title: "سجل العمليات | مدارس وروضة المنال" },
      { name: "description", content: "تتبّع كل تغيير حسّاس داخل المنصة مع الجهاز وعنوان الإنترنت." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AmsShell title="سجل العمليات" description="أرشيف العمليات الحسّاسة داخل المنصة" wide>
      <AuditBoard />
    </AmsShell>
  ),
});
