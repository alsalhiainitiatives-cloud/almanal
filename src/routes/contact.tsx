import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbScript, pageHead } from "@/lib/seo";

import { ContactBlock } from "@/components/site/ContactBlock";
import { ContactForm } from "@/components/site/ContactForm";
import { PageHero } from "@/components/site/PageHero";
import { SectionShell } from "@/components/site/SectionShell";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";


export const Route = createFileRoute("/contact")({
  head: () => ({
    ...pageHead({
      path: "/contact",
      title: "تواصل معنا | مدارس وروضة المنال في عنيزة",
      description:
        "عنوان مدارس وروضة المنال: حي الخزامي، عنيزة 56417. هاتف 0503677107. أوقات العمل من الأحد إلى الخميس 7:00 ص – 12:30 م.",
    }),
    scripts: [
      breadcrumbScript([
        { name: "الرئيسية", path: "/" },
        { name: "تواصل معنا", path: "/contact" },
      ]),
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { pages } = useSiteContent();
  const hero = pages.contact;
  return (
    <>
      <PageHero
        eyebrow={hero?.eyebrow ?? "تواصل معنا"}
        title={hero?.title ?? "نرحّب بكم في حي الخزامي بعنيزة"}
        description={
          hero?.description ??
          "يمكنكم الاتصال بنا أو زيارة المدرسة خلال أوقات العمل، وسنكون سعداء باستقبالكم في جولة تعريفية."
        }
        image={hero?.image}
      />
      <SectionShell id="message" index={1} tone="soft" width="mid">
        <ContactForm />
      </SectionShell>

      <SectionShell id="reach" index={2} eyebrow="بيانات التواصل" title="كيف تصل إلينا">
        <ContactBlock />
      </SectionShell>
    </>
  );
}
