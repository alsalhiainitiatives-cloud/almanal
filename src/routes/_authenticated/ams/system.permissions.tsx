import { createFileRoute } from "@tanstack/react-router";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionsBoard } from "@/features/admin/components/PermissionsBoard";
import { RoleAccessMap } from "@/features/admin/components/RoleAccessMap";
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
      <Tabs defaultValue="matrix" className="space-y-5">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="matrix" className="rounded-xl font-bold">
            مصفوفة الصلاحيات
          </TabsTrigger>
          <TabsTrigger value="access" className="rounded-xl font-bold">
            خريطة ظهور التبويبات
          </TabsTrigger>
        </TabsList>
        <TabsContent value="matrix">
          <PermissionsBoard />
        </TabsContent>
        <TabsContent value="access">
          <RoleAccessMap />
        </TabsContent>
      </Tabs>
    </AmsShell>
  ),
});
