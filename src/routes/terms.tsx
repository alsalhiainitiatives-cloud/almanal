import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbScript, pageHead } from "@/lib/seo";

import { LegalDocument, LegalNotAvailable } from "@/components/site/LegalDocument";
import { useLegalDoc } from "@/features/site-content/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    ...pageHead({
      path: "/terms",
      title: "شروط الاستخدام | مدارس وروضة المنال",
      description:
        "الشروط المنظِّمة لاستخدام موقع مدارس وروضة المنال ونظام التسجيل الإلكتروني: الحساب، الطلبات، المرفقات، الرسوم والمشاركات.",
      type: "article",
    }),
    scripts: [
      breadcrumbScript([
        { name: "الرئيسية", path: "/" },
        { name: "شروط الاستخدام", path: "/terms" },
      ]),
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const doc = useLegalDoc("terms");
  return doc ? <LegalDocument doc={doc} /> : <LegalNotAvailable />;
}
