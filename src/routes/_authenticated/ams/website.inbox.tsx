import { createFileRoute } from "@tanstack/react-router";

import { AccessNotice } from "@/features/ams/components/AccessNotice";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";
import { P } from "@/features/auth/rbac";
import { MessagesInbox } from "@/features/inbox/components/MessagesInbox";
import { useInboxRealtime } from "@/features/inbox/useInboxRealtime";

export const Route = createFileRoute("/_authenticated/ams/website/inbox")({
  head: () => ({
    meta: [
      { title: "المراسلات الواردة | مدارس وروضة المنال" },
      { name: "description", content: "متابعة رسائل التواصل الواردة من الموقع والرد عليها." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteInboxPage,
});

function WebsiteInboxPage() {
  const { hasPermission } = useAuth();
  const canManage =
    hasPermission(P.inboxView) ||
    hasPermission(P.applicationsReview) ||
    hasPermission(P.settingsManage);

  useInboxRealtime(canManage);

  return (
    <AmsShell
      title="المراسلات الواردة"
      description="رسائل نموذج التواصل مع الردود والحالات والملاحظات والتصدير"
      wide
    >
      {canManage ? (
        <MessagesInbox
          abilities={{
            canReply: hasPermission(P.inboxReply),
            canStatus: hasPermission(P.inboxStatus),
            canNote: hasPermission(P.inboxNote),
            canExport: hasPermission(P.inboxExport),
            canDelete: hasPermission(P.inboxDelete),
          }}
        />
      ) : (
        <AccessNotice message="لا تملك صلاحية الاطلاع على المراسلات." />
      )}
    </AmsShell>
  );
}
