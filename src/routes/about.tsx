import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbScript, pageHead } from "@/lib/seo";

import { AboutIntro } from "@/components/site/AboutIntro";
import { PageHero } from "@/components/site/PageHero";
import { SectionShell } from "@/components/site/SectionShell";
import { StatsBand } from "@/components/site/StatsBand";
import { ValueCards } from "@/components/site/ValueCards";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { siteIcon } from "@/features/site-content/icons";
import { staggerItem, StaggerGroup } from "@/components/site/Reveal";
import { motion } from "motion/react";


export const Route = createFileRoute("/about")({
  head: () => ({
    ...pageHead({
      path: "/about",
      title: "عن مدارس وروضة المنال | رؤيتنا ورسالتنا في التعليم",
      description:
        "تعرّف على مدارس وروضة المنال، مشروع تربوي تابع للجمعية الأهلية الصالحية بعنيزة: القصة والرسالة والركائز والقيم التي نربي عليها أطفال عنيزة.",
    }),
    scripts: [
      breadcrumbScript([
        { name: "الرئيسية", path: "/" },
        { name: "عن المنال", path: "/about" },
      ]),
    ],
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

  return (
    <>
      <PageHero
        eyebrow={hero?.eyebrow ?? "عن المنال"}
        title={hero?.title ?? "مشروع تربوي وُلد من قلب المجتمع"}
        description={hero?.description ?? content.brand.description}
        image={hero?.image}
      />

      {/* 01 · قصتنا — same block used on the home page */}
      <SectionShell id="story" index={1} tone="soft">
        <AboutIntro
          eyebrow={storyEyebrow}
          title={storyTitle}
          description={storyDescription}
          image={storyImage}
          cards={highlights}
          badgeValue={content.home.aboutBadgeValue}
          badgeLabel={content.home.aboutBadgeLabel}
          flip
        />
      </SectionShell>

      {/* 02 · ركائزنا */}
      <SectionShell id="pillars" index={2} tone="beige" eyebrow={pillarsEyebrow} title={pillarsTitle}>
        <StaggerGroup className="grid gap-6 md:grid-cols-3">
          {pillars.map((item, i) => {
            const Icon = siteIcon(item.icon);
            return (
              <motion.div key={item.title} variants={staggerItem}>
                <div className="premium-card group relative h-full overflow-hidden rounded-[2.5rem] p-8">
                  <span aria-hidden className="number-ghost absolute end-6 top-5 text-5xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="grid size-14 place-items-center rounded-3xl bg-sky text-primary transition-transform duration-500 group-hover:-rotate-6">
                    <Icon className="size-7" />
                  </span>
                  <h3 className="mt-6 text-xl text-foreground">{item.title}</h3>
                  <span
                    aria-hidden
                    className="mt-4 block h-0.5 w-10 rounded-full bg-gold transition-all duration-500 group-hover:w-24"
                  />
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </motion.div>
            );
          })}
        </StaggerGroup>
      </SectionShell>

      <StatsBand />

      {/* 03 · قيمنا */}
      <SectionShell id="values" index={3} eyebrow={valuesEyebrow} title={valuesTitle}>
        <ValueCards />
      </SectionShell>
    </>
  );
}
