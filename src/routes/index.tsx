import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ContactBlock } from "@/components/site/ContactBlock";
import { Doodle, MarqueeBand, WaveDivider } from "@/components/site/Decor";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { Hero } from "@/components/site/Hero";
import { NewsCards } from "@/components/site/NewsCards";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { StageCards } from "@/components/site/StageCards";
import { StatsBand } from "@/components/site/StatsBand";
import { Testimonials } from "@/components/site/Testimonials";
import { ValueCards } from "@/components/site/ValueCards";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { siteIcon } from "@/features/site-content/icons";
import { useSiteMedia } from "@/features/site-content/media";

const title = "مدارس وروضة المنال | روضة ومدرسة ابتدائية في عنيزة";
const description =
  "مدارس وروضة المنال في عنيزة: حضانة، برنامج مونتيسوري، ومرحلة ابتدائية ببيئة آمنة وقيم إسلامية وتعليم حديث. تعرّف على المراحل والأنشطة وتواصل معنا.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const MISSION_TONES = ["bg-accent", "bg-sky", "bg-mint", "bg-lavender"];

function Index() {
  const { home, gallery } = useSiteContent();
  const missionCards = home.missionCards;
  const sections = home.sections;
  const lifeItems = gallery.slice(0, 6);
  const resolve = useSiteMedia([home.aboutImage, ...lifeItems.map((item) => item.src)]);

  return (
    <>
      <Hero />

      {/* About preview */}
      <section className="section-y relative overflow-hidden">
        <Doodle kind="spark" className="end-8 top-16 hidden text-gold/60 lg:block" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-8 lg:grid-cols-2">
          <Reveal direction="right">
            <div className="relative">
              <span
                aria-hidden
                className="absolute -bottom-6 -start-6 size-40 rounded-full bg-mint/70 blur-2xl"
              />
              <span
                aria-hidden
                className="absolute -top-8 -end-8 size-28 rounded-full border border-gold/40"
              />
              <div className="relative overflow-hidden blob-shape-alt shadow-glow">
                <img
                  src={resolve(home.aboutImage)}
                  alt="مبنى مدارس وروضة المنال في حي الخزامي بعنيزة"
                  width={1400}
                  height={1200}
                  loading="lazy"
                  className="aspect-4/3 w-full object-cover"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-linear-to-t from-primary/35 via-transparent to-transparent"
                />
              </div>
              <div className="glass-panel absolute -bottom-5 end-6 rounded-3xl px-5 py-3 text-center ring-gold-soft">
                <p className="font-latin text-xl font-black text-secondary">{home.aboutBadgeValue}</p>
                <p className="text-xs font-bold text-muted-foreground">{home.aboutBadgeLabel}</p>
              </div>
            </div>
          </Reveal>

          <div>
            <SectionHeading
              align="start"
              eyebrow={home.aboutEyebrow}
              title={home.aboutTitle}
              description={home.aboutDescription}
            />
            <div className="mt-8 space-y-4">
              {missionCards.map((card, i) => {
                const Icon = siteIcon(card.icon);
                return (
                <Reveal key={card.title} delay={i * 0.08}>
                  <div className="group flex gap-4 rounded-[1.5rem] border border-border/60 bg-card p-5 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:border-gold/50 hover:shadow-card">
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-[1.1rem] transition-transform duration-500 group-hover:-rotate-6 ${MISSION_TONES[i % MISSION_TONES.length]} text-primary`}
                    >
                      <Icon className="size-6" />
                    </span>
                    <span>
                      <span className="block font-extrabold text-foreground">{card.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        {card.body}
                      </span>
                    </span>
                  </div>
                </Reveal>
                );
              })}
            </div>
            <Reveal delay={0.3} className="mt-8">
              <Button asChild variant="hero" size="lg">
                <Link to="/about">
                  المزيد عن المنال
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Stages */}
      <MarqueeBand items={home.marquee} />

      <section className="section-y relative overflow-hidden bg-beige/60 pt-24 md:pt-28">
        <div className="pattern-dots absolute inset-0 opacity-40" aria-hidden />
        <div className="relative z-20 mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow={sections.stages.eyebrow}
            title={sections.stages.title}
            description={sections.stages.description || undefined}
          />
          <div className="mt-14">
            <StageCards />
          </div>
        </div>
        <WaveDivider className="text-background" />
      </section>

      {/* Why choose */}
      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow={sections.values.eyebrow}
            title={sections.values.title}
            description={sections.values.description || undefined}
          />
          <div className="mt-14">
            <ValueCards />
          </div>
        </div>
      </section>

      {/* Daily school life */}
      <section className="section-y relative overflow-hidden bg-beige/60 pb-28 md:pb-36">
        <div className="relative z-20 mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow={sections.life.eyebrow}
            title={sections.life.title}
            description={sections.life.description || undefined}
          />
          <div className="mt-14 grid auto-rows-[minmax(0,1fr)] gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lifeItems.map((item, index) => (
              <Reveal
                key={item.id}
                delay={index * 0.06}
                className={index === 0 ? "sm:col-span-2 sm:row-span-2" : ""}
              >
                <figure className="group relative h-full overflow-hidden rounded-[2rem] shadow-soft ring-gold-soft">
                  {item.kind === "video" ? (
                    <video
                      src={resolve(item.src)}
                      controls
                      preload="metadata"
                      className="size-full min-h-64 w-full bg-foreground/5 object-cover"
                    />
                  ) : (
                    <img
                      src={resolve(item.src)}
                      alt={item.description || item.title}
                      width={1000}
                      height={800}
                      loading="lazy"
                      className={`w-full object-cover transition-transform duration-[900ms] group-hover:scale-110 ${index === 0 ? "h-full min-h-72 sm:min-h-full" : "aspect-4/3"}`}
                    />
                  )}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-linear-to-t from-primary/75 via-primary/10 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-95"
                  />
                  <figcaption className="absolute inset-x-4 bottom-4 translate-y-1 transition-transform duration-500 group-hover:translate-y-0">
                    <span className="block text-sm font-extrabold text-primary-foreground drop-shadow">
                      {item.title}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-gold">
                      <span aria-hidden className="h-px w-5 bg-gold" />
                      {item.category}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2} className="mt-12 text-center">
            <Button asChild variant="soft" size="lg">
              <Link to="/school-life">
                <Compass className="size-5" />
                تعرّف على الحياة المدرسية
              </Link>
            </Button>
          </Reveal>
        </div>
        <WaveDivider className="text-background" />
      </section>

      <StatsBand />

      {/* Testimonials */}
      <section className="section-y relative overflow-hidden">
        <div
          aria-hidden
          className="animate-float-slower pointer-events-none absolute -top-10 start-1/4 size-72 rounded-full bg-lavender/50 blur-3xl"
        />
        <div className="relative z-10 mx-auto max-w-6xl px-4 md:px-8">
          <SectionHeading
            eyebrow={sections.testimonials.eyebrow}
            title={sections.testimonials.title}
            description={sections.testimonials.description || undefined}
          />
          <div className="mt-14">
            <Testimonials variant="carousel" limit={8} showForm={false} moreLink />
          </div>
        </div>
      </section>

      {/* News */}
      <section className="section-y bg-beige/60">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow={sections.news.eyebrow}
            title={sections.news.title}
            description={sections.news.description || undefined}
          />
          <div className="mt-14">
            <NewsCards limit={3} />
          </div>
          <Reveal delay={0.2} className="mt-12 text-center">
            <Button asChild variant="soft" size="lg">
              <Link to="/news">
                كل الأخبار
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* FAQ preview */}
      <section className="section-y">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <SectionHeading
            eyebrow={sections.faq.eyebrow}
            title={sections.faq.title}
            description={sections.faq.description || undefined}
          />
          <div className="mt-12">
            <FaqAccordion limit={5} />
          </div>
          <Reveal delay={0.2} className="mt-10 text-center">
            <Button asChild variant="outline" size="lg">
              <Link to="/faq">كل الأسئلة</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* Contact */}
      <section className="section-y bg-beige/60">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow={sections.contact.eyebrow}
            title={sections.contact.title}
            description={sections.contact.description || undefined}
          />
          <div className="mt-14">
            <ContactBlock />
          </div>
        </div>
      </section>
    </>
  );
}
