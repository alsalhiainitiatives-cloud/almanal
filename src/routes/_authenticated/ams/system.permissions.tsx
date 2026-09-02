import { createFileRoute } from "@tanstack/react-router";

import { PermissionsBoard } from "@/features/admin/components/PermissionsBoard";
import { AmsShell } from "@/features/ams/components/AmsShell";

export const Route = createFileRoute("/_authenticated/ams/system/permissions")({
  head: () => ({
    meta: [
      { title: "مصفوفة الصلاحيات | مدارس وروضة المنال" },
      { name: "description", content: "تحكم دقيق في صلاحيات كل دور داخل منصة المنال." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AmsShell
      title="مصفوفة الصلاحيات"
      description="حدّد ما يمكن لكل دور رؤيته وتنفيذه داخل المنصة"
      wide
    >
      <PermissionsBoard />
    </AmsShell>
  ),
});
