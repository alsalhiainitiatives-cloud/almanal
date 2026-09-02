import { createFileRoute } from "@tanstack/react-router";

import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { LinkMyChildBoard } from "@/features/ams/components/students/LinkMyChildBoard";

export const Route = createFileRoute("/_authenticated/link-children")({
  head: () => ({
    meta: [
      { title: "ربط أبنائي بحسابي | مدارس وروضة المنال" },
      {
        name: "description",
        content: "ربط أبنائك بحساب ولي الأمر عبر رقم الهوية أو الرقم الأكاديمي لمتابعة تقدّمهم.",
      },
      { property: "og:title", content: "ربط أبنائي بحسابي — مدارس وروضة المنال" },
      {
        property: "og:description",
        content: "أدخل رقم هوية طفلك أو رقمه الأكاديمي ليُربط بحسابك مباشرة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalLayout
      title="ربط أبنائي بحسابي"
      description="ربط الأبناء المسجّلين في المدرسة بحسابك عبر رقم الهوية أو الرقم الأكاديمي"
    >
      <LinkMyChildBoard />
    </PortalLayout>
  ),
});
