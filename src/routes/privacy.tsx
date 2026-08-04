import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument, LegalNotAvailable } from "@/components/site/LegalDocument";
import { useLegalDoc } from "@/features/site-content/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — روضة ومدارس المنال" },
      {
        name: "description",
        content:
          "كيف تجمع روضة ومدارس المنال بالعنيزة بيانات الأطفال وأولياء الأمور، وكيف تحفظها وتشاركها، وحقوق ولي الأمر تجاه بياناته.",
      },
      { property: "og:title", content: "سياسة الخصوصية — روضة ومدارس المنال" },
      {
        property: "og:description",
        content: "سياسة واضحة لحماية بيانات الأطفال وأسرهم في موقع ونظام تسجيل المنال.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://almanal.lovable.app/privacy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://almanal.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const doc = useLegalDoc("privacy");
  return doc ? <LegalDocument doc={doc} /> : <LegalNotAvailable />;
}
