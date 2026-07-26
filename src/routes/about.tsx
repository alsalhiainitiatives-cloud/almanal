import { createFileRoute } from "@tanstack/react-router";
import { Building2, Heart, ShieldCheck, Sparkles, Target, Users } from "lucide-react";

import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { StatsBand } from "@/components/site/StatsBand";
import { ValueCards } from "@/components/site/ValueCards";
import { images } from "@/data/gallery";
import { school } from "@/data/site";

const title = "عن المنال | مدارس وروضة المنال بعنيزة";
const description =
  "تعرّف على مدارس وروضة المنال، مشروع تربوي تابع للجمعية الأهلية الصالحية بعنيزة: الرسالة والرؤية والقيم والكادر التعليمي.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const pillars = [
  {
    icon: Target,
    title: "رسالتنا",
    body: "تقديم تعليم نوعي يوازن بين المعرفة والقيم، ويجعل من كل طفل متعلمًا واثقًا محبًا للخير ومسؤولًا عن نفسه ومجتمعه.",
  },
  {
    icon: Sparkles,
    title: "رؤيتنا",
    body: "أن نكون الخيار الأول للأسر في عنيزة في تعليم الطفولة المبكرة والمرحلة الابتدائية، بمعايير تُقارن بأفضل المدارس العالمية.",
  },
  {
    icon: Heart,
    title: "قيمنا",
    body: "الأمان، الرحمة، الإتقان، الشراكة مع الأسرة، والانتماء لهويتنا الإسلامية.",
  },
];

const highlights = [
  {
    icon: Building2,
    title: "حرم مدرسي واحد متكامل",
    body: "جميع المراحل في مبنى واحد مهيأ بحي الخزامي، ما يسهّل على الأسرة متابعة أبنائها.",
  },
  {
    icon: Users,
    title: "كادر نسائي مؤهل",
    body: "معلمات ومربيات مدربات على مناهج الطفولة المبكرة وبرنامج المونتيسوري.",
  },
  {
    icon: ShieldCheck,
    title: "معايير سلامة صارمة",
    body: "إجراءات دخول وخروج منظمة، إشراف دائم، وخطط طوارئ يتم تدريب الكادر عليها.",
  },
];

function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="عن المنال"
        title="مشروع تربوي وُلد من قلب المجتمع"
        description={`${school.name} مشروع تعليمي تابع لـ${school.organization}، يقدّم تعليمًا نوعيًا للطفولة المبكرة والمرحلة الابتدائية في محافظة عنيزة.`}
      />

      <section className="section-y">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-8 lg:grid-cols-2">
          <Reveal direction="right">
            <div className="overflow-hidden rounded-4xl shadow-card">
              <img
                src={images.heroClassroom}
                alt="معلمة وأطفال يتعلمون معًا في روضة المنال"
                width={1600}
                height={1200}
                loading="lazy"
                className="aspect-4/3 w-full object-cover"
              />
            </div>
          </Reveal>
          <div className="space-y-5">
            <SectionHeading
              align="start"
              eyebrow="قصتنا"
              title="نبني إنسانًا قبل أن نبني متعلمًا"
              description="بدأت المنال بفكرة بسيطة: أن يجد الطفل في مدرسته الأمان الذي يجده في بيته، والفرح الذي يجعله يحب التعلّم. اليوم نرافق مئات الأطفال من الحضانة حتى الصف السادس عبر برامج مدروسة ومعلمات يحملن هذه الرسالة."
            />
            <div className="space-y-4">
              {highlights.map((item, i) => (
                <Reveal key={item.title} delay={i * 0.08}>
                  <div className="flex gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                      <item.icon className="size-6" />
                    </span>
                    <span>
                      <span className="block font-extrabold text-foreground">{item.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-y bg-beige/60">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="مبادئنا" title="الرسالة والرؤية والقيم" />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {pillars.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1}>
                <div className="h-full rounded-4xl bg-card p-8 shadow-soft">
                  <span className="grid size-14 place-items-center rounded-3xl bg-sky text-primary">
                    <item.icon className="size-7" />
                  </span>
                  <h3 className="mt-6 text-xl text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <StatsBand />

      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="لماذا المنال" title="ما يميّز تجربتنا التعليمية" />
          <div className="mt-14">
            <ValueCards />
          </div>
        </div>
      </section>
    </>
  );
}