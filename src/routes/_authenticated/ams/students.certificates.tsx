import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { StudentCertificatesBoard } from "@/features/ams/components/students/EncouragementCertificate";

export const Route = createFileRoute("/_authenticated/ams/students/certificates")({
  head: () => ({
    meta: [
      { title: "شهادات الطلاب | مدارس وروضة المنال" },
      { name: "description", content: "إصدار شهادات تشجيعية مخصصة لطلاب روضة ومدارس المنال." },
      { property: "og:title", content: "شهادات الطلاب | مدارس وروضة المنال" },
      { property: "og:description", content: "إصدار شهادات تشجيعية مخصصة لطلاب روضة ومدارس المنال." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentCertificatesPage,
});

function StudentCertificatesPage() {
  return (
    <AmsShell
      title="شهادات الطلاب"
      description="إصدار شهادات تشجيعية احترافية ببيانات الطالب الحقيقية وهوية المدرسة"
      wide
    >
      <StudentCertificatesBoard />
    </AmsShell>
  );
}