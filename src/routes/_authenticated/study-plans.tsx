import { createFileRoute } from "@tanstack/react-router";

import { StudyPlanViewer } from "@/features/academics/components/StudyPlanViewer";
import { PortalLayout } from "@/features/auth/components/PortalLayout";

export const Route = createFileRoute("/_authenticated/study-plans")({
  head: () => ({
    meta: [
      { title: "خطة طفلي الدراسية | مدارس وروضة المنال" },
      {
        name: "description",
        content: "متابعة الخطة الأسبوعية والشهرية لفصل طفلك: الدروس والأوقات وملاحظات المعلمة.",
      },
      { property: "og:title", content: "خطة طفلي الدراسية — مدارس وروضة المنال" },
      {
        property: "og:description",
        content: "الخطط الدراسية المنشورة لفصل طفلك مرتّبة على أيام الأسبوع.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalLayout
      title="خطة طفلي الدراسية"
      description="الدروس المخطّطة لكل يوم مع أوقاتها وملاحظات المعلمة"
    >
      <StudyPlanViewer />
    </PortalLayout>
  ),
});
