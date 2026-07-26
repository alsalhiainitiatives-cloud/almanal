import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Compass, Heart, Sparkles, Target } from "lucide-react";

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
import { galleryItems, images } from "@/data/gallery";
import { school } from "@/data/site";

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

const missionCards = [
  {
    icon: Target,
    title: "رسالتنا",
    body: "تقديم تعليم نوعي يوازن بين المعرفة والقيم، ويجعل من كل طفل متعلمًا واثقًا محبًا للخير.",
    tone: "bg-accent",
  },
  {
    icon: Sparkles,
    title: "رؤيتنا",
    body: "أن نكون الخيار الأول للأسر في عنيزة في تعليم الطفولة المبكرة والمرحلة الابتدائية.",
    tone: "bg-sky",
  },
  {
    icon: Heart,
    title: "قيمنا",
    body: "الأمان، الرحمة، الإتقان، والشراكة الحقيقية مع الأسرة في كل خطوة.",
    tone: "bg-mint",
  },
];

function Index() {
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
              <div className="relative overflow-hidden blob-shape-alt shadow-glow">
                <img
                  src={images.campus}
                  alt="مبنى مدارس وروضة المنال في حي الخزامي بعنيزة"
                  width={1400}
                  height={1200}
                  loading="lazy"
                  className="aspect-4/3 w-full object-cover"
                />
              </div>
              <div className="glass-panel absolute -bottom-5 end-6 rounded-3xl px-5 py-3 text-center">
                <p className="font-latin text-xl font-black text-secondary">400+</p>
                <p className="text-xs font-bold text-muted-foreground">أسرة تثق بنا</p>
              </div>
            </div>
          </Reveal>

          <div>
            <SectionHeading
              align="start"
              eyebrow="عن المنال"
              title="مشروع تربوي تابع للجمعية الأهلية الصالحية بعنيزة"
              description={school.description}
            />
            <div className="mt-8 space-y-4">
              {missionCards.map((card, i) => (
                <Reveal key={card.title} delay={i * 0.08}>
                  <div className="flex gap-4 rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-soft transition-shadow hover:shadow-card">
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-[1.1rem] ${card.tone} text-primary`}
                    >
                      <card.icon className="size-6" />
                    </span>
                    <span>
                      <span className="block font-extrabold text-foreground">{card.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        {card.body}
                      </span>
                    </span>
                  </div>
                </Reveal>
              ))}
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
      <MarqueeBand
        items={["تعليم بمحبة", "قيم إسلامية", "بيئة آمنة", "مونتيسوري معتمد", "أنشطة ممتعة"]}
      />

      <section className="section-y relative overflow-hidden bg-beige/60 pt-24 md:pt-28">
        <div className="pattern-dots absolute inset-0 opacity-40" aria-hidden />
        <div className="relative z-20 mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow="المراحل التعليمية"
            title="ثلاث مراحل تنمو مع طفلك"
            description="من الحضانة الدافئة إلى بيئة المونتيسوري ثم المرحلة الابتدائية، رحلة متصلة ومصممة بعناية."
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
            eyebrow="لماذا المنال"
            title="أسباب تجعل الأسر تختارنا"
            description="كل تفصيل في المنال مصمم ليمنح طفلك الأمان والفرح والتعلّم العميق."
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
            eyebrow="الحياة المدرسية"
            title="يوم في المنال"
            description="قراءة، رسم، علوم، رياضة، وأناشيد — أنشطة متوازنة تصنع يومًا سعيدًا ومفيدًا."
          />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {galleryItems.slice(0, 6).map((item, index) => (
              <Reveal key={item.title} delay={index * 0.06}>
                <figure className="group relative h-full overflow-hidden rounded-4xl shadow-soft">
                  <img
                    src={item.src}
                    alt={item.alt}
                    width={1000}
                    height={800}
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <figcaption className="absolute inset-x-4 bottom-4 rounded-2xl bg-card/85 px-4 py-3 backdrop-blur-md">
                    <span className="block text-sm font-extrabold text-primary">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.category}</span>
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
      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow="آراء أولياء الأمور"
            title="ثقة الأسر هي أجمل شهادة"
          />
          <div className="mt-14">
            <Testimonials />
          </div>
        </div>
      </section>

      {/* News */}
      <section className="section-y bg-beige/60">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="آخر الأخبار" title="ما يحدث في المنال" />
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
          <SectionHeading eyebrow="الأسئلة الشائعة" title="أسئلة يسألها أولياء الأمور" />
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
            eyebrow="تواصل معنا"
            title="نرحّب بزيارتكم في حي الخزامي بعنيزة"
            description="زوروا المدرسة أو اتصلوا بنا خلال أوقات العمل، وسنكون سعداء بالإجابة على كل استفساراتكم."
          />
          <div className="mt-14">
            <ContactBlock />
          </div>
        </div>
      </section>
    </>
  );
}
