import { createFileRoute } from "@tanstack/react-router";

import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { StatsBand } from "@/components/site/StatsBand";
import { ValueCards } from "@/components/site/ValueCards";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { siteIcon } from "@/features/site-content/icons";
import { useSiteMedia } from "@/features/site-content/media";

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

function AboutPage() {
  const content = useSiteContent();
  const hero = content.pages.about;
  const {
    highlights,
    pillars,
    storyEyebrow,
    storyTitle,
    storyDescription,
    storyImage,
    pillarsEyebrow,
    pillarsTitle,
    valuesEyebrow,
    valuesTitle,
  } = content.about;
  const resolve = useSiteMedia([storyImage]);

  return (
    <>
      <PageHero
        eyebrow={hero?.eyebrow ?? "عن المنال"}
        title={hero?.title ?? "مشروع تربوي وُلد من قلب المجتمع"}
        description={hero?.description ?? content.brand.description}
      />

      <section className="section-y">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-8 lg:grid-cols-2">
          <Reveal direction="right">
            <div className="overflow-hidden rounded-4xl shadow-card">
              <img
                src={resolve(storyImage)}
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
              eyebrow={storyEyebrow}
              title={storyTitle}
              description={storyDescription}
            />
            <div className="space-y-4">
              {highlights.map((item, i) => {
                const Icon = siteIcon(item.icon);
                return (
                <Reveal key={item.title} delay={i * 0.08}>
                  <div className="flex gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                      <Icon className="size-6" />
                    </span>
                    <span>
                      <span className="block font-extrabold text-foreground">{item.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                  </div>
                </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="section-y bg-beige/60">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow={pillarsEyebrow} title={pillarsTitle} />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {pillars.map((item, i) => {
              const Icon = siteIcon(item.icon);
              return (
              <Reveal key={item.title} delay={i * 0.1}>
                <div className="h-full rounded-4xl bg-card p-8 shadow-soft">
                  <span className="grid size-14 place-items-center rounded-3xl bg-sky text-primary">
                    <Icon className="size-7" />
                  </span>
                  <h3 className="mt-6 text-xl text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <StatsBand />

      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow={valuesEyebrow} title={valuesTitle} />
          <div className="mt-14">
            <ValueCards />
          </div>
        </div>
      </section>
    </>
  );
}