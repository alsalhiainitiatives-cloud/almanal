import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbScript, pageHead } from "@/lib/seo";

import { LegalDocument, LegalNotAvailable } from "@/components/site/LegalDocument";
import { useLegalDoc } from "@/features/site-content/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    ...pageHead({
      path: "/privacy",
      title: "سياسة الخصوصية | مدارس وروضة المنال",
      description:
        "كيف تجمع مدارس وروضة المنال بعنيزة بيانات الأطفال وأولياء الأمور، وكيف تحفظها وتشاركها، وحقوق ولي الأمر تجاه بياناته.",
      type: "article",
    }),
    scripts: [
      breadcrumbScript([
        { name: "الرئيسية", path: "/" },
        { name: "سياسة الخصوصية", path: "/privacy" },
      ]),
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const doc = useLegalDoc("privacy");
  return doc ? <LegalDocument doc={doc} /> : <LegalNotAvailable />;
}
