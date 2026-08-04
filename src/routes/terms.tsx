import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument, LegalNotAvailable } from "@/components/site/LegalDocument";
import { useLegalDoc } from "@/features/site-content/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — روضة ومدارس المنال" },
      {
        name: "description",
        content:
          "الشروط المنظِّمة لاستخدام موقع روضة ومدارس المنال ونظام التسجيل الإلكتروني: الحساب، الطلبات، المرفقات، الرسوم والمشاركات.",
      },
      { property: "og:title", content: "شروط الاستخدام — روضة ومدارس المنال" },
      {
        property: "og:description",
        content: "قواعد واضحة لاستخدام الموقع وتقديم طلبات التسجيل والتعامل مع الرسوم والمرفقات.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://almanal.lovable.app/terms" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://almanal.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const doc = useLegalDoc("terms");
  return doc ? <LegalDocument doc={doc} /> : <LegalNotAvailable />;
}
