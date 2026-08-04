import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { faqs } from "@/data/site";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";

const title = "الأسئلة الشائعة | مدارس وروضة المنال";
const description =
  "إجابات عن أكثر أسئلة أولياء الأمور: أعمار القبول، أوقات الدراسة، برنامج المونتيسوري، السلامة، الأنشطة، والتسجيل.";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { pages } = useSiteContent();
  const hero = pages.faq;
  return (
    <>
      <PageHero
        eyebrow={hero?.eyebrow ?? "الأسئلة الشائعة"}
        title={hero?.title ?? "كل ما تحتاج معرفته قبل التسجيل"}
        description={
          hero?.description ??
          "جمعنا لكم أكثر الأسئلة التي تصلنا من الأسر، وإن لم تجدوا إجابتكم فنحن على بعد مكالمة."
        }
        image={hero?.image}
      />
      <section className="section-y">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <FaqAccordion />
          <Reveal delay={0.15} className="mt-12 rounded-4xl bg-card p-8 text-center shadow-card">
            <h2 className="text-2xl text-foreground">لديك سؤال آخر؟</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              فريق المنال يسعد بالإجابة على استفساراتكم خلال أوقات العمل.
            </p>
            <Button asChild variant="hero" size="lg" className="mt-6">
              <Link to="/contact">تواصل معنا</Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </>
  );
}