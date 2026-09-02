import { createFileRoute } from "@tanstack/react-router";

import { AccessNotice } from "@/features/ams/components/AccessNotice";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { useAuth } from "@/features/auth/AuthProvider";
import { P } from "@/features/auth/rbac";
import { TestimonialsModeration } from "@/features/site-content/components/TestimonialsModeration";

export const Route = createFileRoute("/_authenticated/ams/website/reviews")({
  head: () => ({
    meta: [
      { title: "التقييمات والآراء | مدارس وروضة المنال" },
      { name: "description", content: "مراجعة تقييمات أولياء الأمور واعتمادها قبل نشرها في الموقع." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteReviewsPage,
});

function WebsiteReviewsPage() {
  const { hasPermission } = useAuth();
  const canManage =
    hasPermission(P.inboxView) ||
    hasPermission(P.applicationsReview) ||
    hasPermission(P.settingsManage);
  const canModerate = hasPermission(P.reviewsModerate);

  return (
    <AmsShell
      title="التقييمات والآراء"
      description="آراء أولياء الأمور الواردة من الموقع — اعتماد أو رفض قبل النشر"
      wide
    >
      {canManage ? (
        <TestimonialsModeration
          canModerate={canModerate}
          canDelete={canModerate && hasPermission(P.inboxDelete)}
          canReply={hasPermission(P.inboxReply)}
        />
      ) : (
        <AccessNotice message="لا تملك صلاحية الاطلاع على التقييمات." />
      )}
    </AmsShell>
  );
}
