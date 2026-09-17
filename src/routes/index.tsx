import { createFileRoute } from "@tanstack/react-router";

import { school } from "@/data/site";
import { pageHead, siteGraphScript } from "@/lib/seo";


import { AboutIntro } from "@/components/site/AboutIntro";
import { ContactBlock } from "@/components/site/ContactBlock";
import { MarqueeBand } from "@/components/site/Decor";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { Hero } from "@/components/site/Hero";
import { LifeGrid } from "@/components/site/LifeGrid";
import { NewsCards } from "@/components/site/NewsCards";
import { SectionShell } from "@/components/site/SectionShell";
import { StageCards } from "@/components/site/StageCards";
import { StatsBand } from "@/components/site/StatsBand";
import { Testimonials } from "@/components/site/Testimonials";
import { ValueCards } from "@/components/site/ValueCards";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    ...pageHead({
      path: "/",
      title: "مدارس وروضة المنال | روضة ومدرسة ابتدائية في عنيزة",
      description:
        "روضة ومدارس المنال في عنيزة تقدم تعليمًا نوعيًا للطفولة المبكرة والمرحلة الابتدائية في بيئة آمنة ومحبة، مع برنامج مونتيسوري وأنشطة تعليمية متوازنة وشراكة فعالة مع الأسرة.",
    }),
    scripts: [siteGraphScript(school)],
  }),
  component: Index,
});

function Index() {
  const { home, gallery } = useSiteContent();
  const sections = home.sections;
  const lifeItems = gallery.slice(0, 6);

  return (
    <>
      <Hero />

      {/* 01 · عن المنال — mirrors /about */}
      <SectionShell id="about" index={1} tone="soft">
        <AboutIntro
          eyebrow={home.aboutEyebrow}
          title={home.aboutTitle}
          description={home.aboutDescription}
          image={home.aboutImage}
          badgeValue={home.aboutBadgeValue}
          badgeLabel={home.aboutBadgeLabel}
          cards={home.missionCards}
          ctaLabel="المزيد عن المنال"
          ctaTo="/about"
        />
      </SectionShell>

      <MarqueeBand items={home.marquee} />

      {/* 02 · المراحل التعليمية والتسجيل — mirrors /admissions */}
      <SectionShell
        id="stages"
        index={2}
        tone="beige"
        eyebrow={sections.stages.eyebrow}
        title={sections.stages.title}
        description={sections.stages.description}
        ctaLabel="المراحل والتسجيل"
        ctaTo="/admissions"
      >
        <StageCards />
      </SectionShell>

      {/* 03 · لماذا المنال — mirrors /about values */}
      <SectionShell
        id="values"
        index={3}
        eyebrow={sections.values.eyebrow}
        title={sections.values.title}
        description={sections.values.description}
        ctaLabel="تعرّف على قيمنا"
        ctaTo="/about"
        ctaVariant="outline"
      >
        <ValueCards />
      </SectionShell>

      {/* 04 · الحياة المدرسية — mirrors /school-life */}
      <SectionShell
        id="life"
        index={4}
        tone="beige"
        eyebrow={sections.life.eyebrow}
        title={sections.life.title}
        description={sections.life.description}
        ctaLabel="تعرّف على الحياة المدرسية"
        ctaTo="/school-life"
      >
        <LifeGrid items={lifeItems} />
      </SectionShell>

      <StatsBand />

      {/* 05 · آراء أولياء الأمور — mirrors /testimonials */}
      <SectionShell
        id="testimonials"
        tone="soft"
        width="wide"
        eyebrow={sections.testimonials.eyebrow}
        title={sections.testimonials.title}
        description={sections.testimonials.description}
      >
        <Testimonials variant="carousel" limit={12} showForm={false} moreLink />
      </SectionShell>

      {/* 06 · آخر الأخبار — mirrors /news */}
      <SectionShell
        id="news"
        index={6}
        tone="soft"
        eyebrow={sections.news.eyebrow}
        title={sections.news.title}
        description={sections.news.description}
        ctaLabel="كل الأخبار"
        ctaTo="/news"
      >
        <NewsCards limit={3} />
      </SectionShell>

      {/* 07 · الأسئلة الشائعة — mirrors /faq */}
      <SectionShell
        id="faq"
        index={7}
        tone="beige"
        width="narrow"
        eyebrow={sections.faq.eyebrow}
        title={sections.faq.title}
        description={sections.faq.description}
        ctaLabel="كل الأسئلة"
        ctaTo="/faq"
        ctaVariant="outline"
      >
        <FaqAccordion limit={5} />
      </SectionShell>

      {/* 08 · تواصل معنا — mirrors /contact */}
      <SectionShell
        id="contact"
        index={8}
        eyebrow={sections.contact.eyebrow}
        title={sections.contact.title}
        description={sections.contact.description}
        ctaLabel="صفحة التواصل ونموذج الرسائل"
        ctaTo="/contact"
      >
        <ContactBlock />
      </SectionShell>
    </>
  );
}
