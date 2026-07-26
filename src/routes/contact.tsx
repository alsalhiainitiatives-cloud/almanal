import { createFileRoute } from "@tanstack/react-router";

import { ContactBlock } from "@/components/site/ContactBlock";
import { ContactForm } from "@/components/site/ContactForm";
import { PageHero } from "@/components/site/PageHero";

const title = "تواصل معنا | مدارس وروضة المنال بعنيزة";
const description =
  "عنوان مدارس وروضة المنال: حي الخزامي، عنيزة 56417. هاتف 0503677107. أوقات العمل من الأحد إلى الخميس 7:00 ص – 12:30 م.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="تواصل معنا"
        title="نرحّب بكم في حي الخزامي بعنيزة"
        description="يمكنكم الاتصال بنا أو زيارة المدرسة خلال أوقات العمل، وسنكون سعداء باستقبالكم في جولة تعريفية."
      />
      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-10">
            <ContactForm />
          </div>
          <ContactBlock />
        </div>
      </section>
    </>
  );
}