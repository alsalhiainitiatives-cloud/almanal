import { createFileRoute } from "@tanstack/react-router";

import { AccessNotice } from "@/features/ams/components/AccessNotice";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";
import { P } from "@/features/auth/rbac";
import { SiteSettings } from "@/features/site-content/components/SiteSettings";

export const Route = createFileRoute("/_authenticated/ams/website/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات الموقع الإلكتروني | مدارس وروضة المنال" },
      {
        name: "description",
        content: "تحكم كامل في الشعار والاسم ومعلومات التواصل والفوتر ومحتوى صفحات الموقع العام.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteSettingsPage,
});

function WebsiteSettingsPage() {
  const { hasPermission, roles } = useAuth();
  const allowed =
    hasPermission(P.settingsManage) ||
    hasPermission(P.websiteContentManage) ||
    (roles as string[]).some((r) => ["admin", "supervisor", "principal"].includes(r));

  return (
    <AmsShell
      title="إعدادات الموقع الإلكتروني"
      description="الهوية والشعار والهيرو ومعلومات التواصل ومحتوى الصفحات والسياسات"
      wide
    >
      {allowed ? (
        <SiteSettings />
      ) : (
        <AccessNotice message="لا تملك صلاحية «إدارة محتوى الموقع الإلكتروني». اطلب منحها من مدير النظام." />
      )}
    </AmsShell>
  );
}
