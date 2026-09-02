import { createFileRoute } from "@tanstack/react-router";

import { AccessNotice } from "@/features/ams/components/AccessNotice";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { StorageMaintenancePanel } from "@/features/academics/components/StorageMaintenancePanel";
import { canManageStorage } from "@/features/academics/maintenance";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/ams/system/storage")({
  head: () => ({
    meta: [
      { title: "التخزين والصيانة | مدارس وروضة المنال" },
      { name: "description", content: "متابعة مساحة المرفقات وتنظيف الملفات غير المرتبطة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SystemStoragePage,
});

function SystemStoragePage() {
  const { roles } = useAuth();
  return (
    <AmsShell title="التخزين والصيانة" description="أدوات الاحتفاظ بالبيانات وتنظيف المرفقات" wide>
      {canManageStorage(roles) ? (
        <StorageMaintenancePanel />
      ) : (
        <AccessNotice message="أدوات الصيانة متاحة لمدير النظام وإدارة المدرسة فقط." />
      )}
    </AmsShell>
  );
}
