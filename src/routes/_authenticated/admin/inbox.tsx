import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Star } from "lucide-react";
import { useState } from "react";

import { AccessNotice } from "@/features/ams/components/AccessNotice";
import { useAuth } from "@/features/auth/AuthProvider";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { P } from "@/features/auth/rbac";
import { MessagesInbox } from "@/features/inbox/components/MessagesInbox";
import { TestimonialsModeration } from "@/features/site-content/components/TestimonialsModeration";

export const Route = createFileRoute("/_authenticated/admin/inbox")({
  component: InboxPage,
});

const TABS = [
  { key: "messages" as const, label: "المراسلات الواردة", icon: MessageSquare },
  { key: "reviews" as const, label: "التقييمات والآراء", icon: Star },
];

function InboxPage() {
  const { hasPermission, roles } = useAuth();
  const [tab, setTab] = useState<"messages" | "reviews">("messages");
  const canManage = hasPermission(P.applicationsReview) || hasPermission(P.settingsManage);
  const canDelete = roles.includes("admin") || roles.includes("principal");

  return (
    <PortalLayout
      title="استقبال المراسلات والتقييمات"
      description="مركز واحد لمتابعة رسائل التواصل الواردة من الموقع، والرد عليها، وإدارة تقييمات أولياء الأمور قبل نشرها."
    >
      {!canManage ? (
        <AccessNotice message="لا تملك صلاحية الاطلاع على المراسلات والتقييمات." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 rounded-[1.5rem] border border-border/60 bg-card/80 p-2 shadow-soft">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
                  tab === item.key
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </div>

          {tab === "messages" ? (
            <MessagesInbox canDelete={canDelete} />
          ) : (
            <TestimonialsModeration />
          )}
        </>
      )}
    </PortalLayout>
  );
}