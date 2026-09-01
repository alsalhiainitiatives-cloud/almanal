import { createFileRoute } from "@tanstack/react-router";

import { ChildReports } from "@/features/academics/components/ChildReports";
import { PortalLayout } from "@/features/auth/components/PortalLayout";

export const Route = createFileRoute("/_authenticated/child-reports")({
  head: () => ({
    meta: [
      { title: "تقارير طفلي الأكاديمية | مدارس وروضة المنال" },
      {
        name: "description",
        content:
          "تقارير أسبوعية وشهرية ونهاية الفصل لتقدّم طفلك مع الأدلة والشواهد الرقمية من المعلمة.",
      },
      { property: "og:title", content: "تقارير طفلي الأكاديمية — مدارس وروضة المنال" },
      {
        property: "og:description",
        content: "متابعة تقدّم طفلك في كل درس مع الأدلة الرقمية وإمكانية الطباعة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalLayout
      title="تقارير طفلي الأكاديمية"
      description="تقارير أسبوعية وشهرية ونهاية الفصل مع الأدلة والشواهد الرقمية"
    >
      <ChildReports />
    </PortalLayout>
  ),
});
