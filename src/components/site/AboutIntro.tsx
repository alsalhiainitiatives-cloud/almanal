import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Doodle } from "./Decor";
import { Reveal, staggerItem, StaggerGroup } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import type { IconCard } from "@/features/site-content/defaults";
import { siteIcon } from "@/features/site-content/icons";
import { useSiteMedia } from "@/features/site-content/media";

const TONES = ["bg-accent", "bg-sky", "bg-mint", "bg-lavender"];

/**
 * Editorial "about" block shared by the home page preview and the /about story
 * section, so both read from site settings and share one visual language.
 */
export function AboutIntro({
  eyebrow,
  title,
  description,
  image,
  badgeValue,
  badgeLabel,
  cards,
  ctaLabel,
  ctaTo,
  flip = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** https URL or `classroom-media` storage path (editable in site settings). */
  image?: string;
  badgeValue?: string;
  badgeLabel?: string;
  cards: IconCard[];
  ctaLabel?: string;
  ctaTo?: string;
  flip?: boolean;
}) {
  const resolve = useSiteMedia([image]);
  const src = resolve(image);

  return (
    <div className="relative grid items-center gap-14 lg:grid-cols-[1.02fr_1fr]">
      <Doodle kind="spark" className="end-2 -top-6 hidden text-gold/60 lg:block" />

      <Reveal direction={flip ? "left" : "right"} className={flip ? "lg:order-2" : ""}>
        <div className="relative">
          <span
            aria-hidden
            className="animate-float-slower absolute -bottom-8 -start-8 size-44 rounded-full bg-mint/60 blur-3xl"
          />
          <span
            aria-hidden
            className="animate-spin-slow absolute -top-10 -end-10 size-32 rounded-full border border-dashed border-gold/50"
          />
          <div className="relative overflow-hidden rounded-[3rem] shadow-glow ring-gold-soft">
            {src ? (
              <motion.img
                src={src}
                alt={title}
                width={1400}
                height={1200}
                loading="lazy"
                initial={{ scale: 1.12 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                className="aspect-4/3 w-full object-cover"
              />
            ) : (
              <div className="aspect-4/3 w-full bg-beige" />
            )}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-linear-to-t from-primary/45 via-transparent to-transparent"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-6 bottom-5 h-px gradient-gold-hairline"
            />
          </div>

          {badgeValue ? (
            <div className="glass-panel absolute -bottom-6 end-8 rounded-[1.75rem] px-6 py-4 text-center ring-gold-soft">
              <p className="font-latin text-2xl font-black text-secondary">{badgeValue}</p>
              <p className="mt-0.5 text-xs font-bold text-muted-foreground">{badgeLabel}</p>
            </div>
          ) : null}
        </div>
      </Reveal>

      <div className={flip ? "lg:order-1" : ""}>
        <SectionHeading align="start" eyebrow={eyebrow} title={title} description={description} />

        <StaggerGroup className="mt-9 space-y-4">
          {cards.map((card, i) => {
            const Icon = siteIcon(card.icon);
            return (
              <motion.div
                key={card.title}
                variants={staggerItem}
                className="premium-card group flex gap-4 rounded-[1.75rem] p-5"
              >
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-[1.1rem] text-primary transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105 ${TONES[i % TONES.length]}`}
                >
                  <Icon className="size-6" />
                </span>
                <span>
                  <span className="block font-extrabold text-foreground">{card.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {card.body}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-6 bottom-0 h-px gradient-gold-hairline opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              </motion.div>
            );
          })}
        </StaggerGroup>

        {ctaLabel && ctaTo ? (
          <Reveal delay={0.25} className="mt-9">
            <Button asChild variant="hero" size="lg">
              <Link to={ctaTo}>
                {ctaLabel}
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </Reveal>
        ) : null}
      </div>
    </div>
  );
}
