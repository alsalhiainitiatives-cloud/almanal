import { createFileRoute } from "@tanstack/react-router";

import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { ParentSurveysBoard } from "@/features/surveys/components/ParentSurveysBoard";

export const Route = createFileRoute("/_authenticated/surveys")({
  head: () => ({
    meta: [
      { title: "استبانات أولياء الأمور | مدارس وروضة المنال" },
      {
        name: "description",
        content:
          "الاستبانات المتاحة لأولياء أمور مدارس وروضة المنال مع حالة كل استبانة وتاريخ إغلاقها ورقم مرجعي لكل إجابة.",
      },
      { property: "og:title", content: "استبانات أولياء الأمور — مدارس وروضة المنال" },
      {
        property: "og:description",
        content: "شاركنا رأيك عبر الاستبانات المتاحة، وتابع حالة إجاباتك ورقمها المرجعي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalLayout
      title="استبانات أولياء الأمور"
      description="الاستبانات الموجّهة لك مع حالتها وتاريخ الإغلاق ورقم مرجعي لكل إجابة"
    >
      <ParentSurveysBoard />
    </PortalLayout>
  ),
});
