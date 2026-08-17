import { createFileRoute } from "@tanstack/react-router";

import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { ChildJourney } from "@/features/journey/components/ChildJourney";

export const Route = createFileRoute("/_authenticated/child-journey")({
  head: () => ({
    meta: [
      { title: "يوميات طفلي | مدارس وروضة المنال" },
      {
        name: "description",
        content: "تابع الخطة الأسبوعية لفصل طفلك ومهاراته وإنجازاته بالأدلة الرقمية من المعلمة.",
      },
      { property: "og:title", content: "يوميات طفلي | مدارس وروضة المنال" },
      {
        property: "og:description",
        content: "الخطة الأسبوعية ومستكشف المهارات والإنجازات لطفلك في مدارس وروضة المنال.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChildJourneyPage,
});

function ChildJourneyPage() {
  return (
    <PortalLayout
      title="يوميات طفلي"
      description="الخطة الأسبوعية لفصل طفلك، ومستكشف المهارات والإنجازات مع الأدلة الرقمية"
    >
      <ChildJourney />
    </PortalLayout>
  );
}