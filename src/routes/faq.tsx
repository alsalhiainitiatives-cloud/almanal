import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SectionShell } from "@/components/site/SectionShell";
import { faqs } from "@/data/site";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { breadcrumbScript, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  head: () => ({
    ...pageHead({
      path: "/faq",
      title: "الأسئلة الشائعة | مدارس وروضة المنال",
      description:
        "إجابات عن أكثر أسئلة أولياء الأمور: أعمار القبول، أوقات الدراسة، برنامج المونتيسوري، السلامة، الأنشطة، والتسجيل.",
    }),
    scripts: [
      breadcrumbScript([
        { name: "الرئيسية", path: "/" },
        { name: "الأسئلة الشائعة", path: "/faq" },
      ]),
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
      <SectionShell id="faq" index={1} tone="soft" width="narrow">
        <FaqAccordion />
        <Reveal delay={0.15} className="mt-12">
          <div className="relative isolate overflow-hidden rounded-[2.5rem] gradient-burgundy-deep p-8 text-center text-primary-foreground shadow-glow">
            <div aria-hidden className="pattern-noise absolute inset-0 opacity-70" />
            <div aria-hidden className="absolute inset-x-10 top-0 h-px gradient-gold-hairline" />
            <div className="relative">
              <h2 className="text-2xl text-primary-foreground">لديك سؤال آخر؟</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/80">
                فريق المنال يسعد بالإجابة على استفساراتكم خلال أوقات العمل.
              </p>
              <Button asChild variant="hero" size="lg" className="mt-6">
                <Link to="/contact">تواصل معنا</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </SectionShell>
    </>
  );
}
