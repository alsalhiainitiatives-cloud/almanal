import { createFileRoute } from "@tanstack/react-router";

import { AccessNotice } from "@/features/ams/components/AccessNotice";
import { useAuth } from "@/features/auth/AuthProvider";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { P } from "@/features/auth/rbac";
import { SiteSettings } from "@/features/site-content/components/SiteSettings";

export const Route = createFileRoute("/_authenticated/admin/site-content")({
  component: SiteContentPage,
});

function SiteContentPage() {
  const { hasPermission } = useAuth();

  return (
    <PortalLayout
      title="إعدادات الموقع الإلكتروني"
      description="تحكم كامل في الشعار والاسم ومعلومات التواصل والفوتر ومحتوى صفحات الموقع العام."
    >
      {hasPermission(P.settingsManage) ? (
        <SiteSettings />
      ) : (
        <AccessNotice message="لا تملك صلاحية تعديل محتوى الموقع — هذه الصفحة متاحة لمدير النظام ومدير المدرسة فقط." />
      )}
    </PortalLayout>
  );
}
