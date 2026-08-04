import { Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Compass,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { HeroSlider } from "./HeroSlider";
import { WaveDivider } from "./Decor";

const EASE = [0.22, 1, 0.36, 1] as const;
const CHIP_ICONS = [Star, ShieldCheck, HeartHandshake];

/** Landing hero: full-bleed cinematic slider with an overlaid editorial headline. */
export function Hero() {
  const { hero } = useSiteContent();
  const words = hero.headline.split(" ");

  return (
    <section className="relative isolate flex min-h-[640px] flex-col justify-center overflow-hidden bg-primary md:min-h-[86svh]">
      <HeroSlider
        slides={hero.slides}
        autoplay={hero.autoplay}
        intervalMs={hero.intervalMs}
        effect={hero.effect}
        overlay={hero.overlay}
      />

      <div className="relative z-20 mx-auto w-full max-w-7xl px-4 pt-32 pb-44 md:px-8 md:pt-36 md:pb-52">
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="inline-flex w-fit items-center gap-2 rounded-full glass-dark px-4 py-2 text-xs font-bold text-primary-foreground md:text-sm"
        >
          <Sparkles className="size-4 animate-wiggle text-gold" />
          {hero.badge}
        </motion.span>

        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] font-black text-primary-foreground sm:text-5xl lg:text-[4.4rem]">
          <span className="sr-only">{hero.headline}</span>
          <span aria-hidden className="flex flex-wrap gap-x-4">
            {words.map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease: EASE }}
                className="inline-block"
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>

        <motion.span
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
          aria-hidden
          style={{ width: "9rem", height: "0.4rem", transformOrigin: "right" }}
          className="mt-6 block rounded-full gradient-gold"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
          className="mt-5 max-w-xl text-lg font-bold leading-snug text-primary-foreground/90 md:text-2xl"
        >
          {hero.highlight}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.48, ease: EASE }}
          className="mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/75 md:text-base"
        >
          {hero.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.56, ease: EASE }}
          className="mt-9 flex flex-wrap gap-3"
        >
          <Button asChild variant="hero" size="xl" className="relative overflow-hidden">
            <Link to={hero.primaryCta.to}>
              {hero.primaryCta.label}
              <span
                aria-hidden
                className="animate-shine pointer-events-none absolute inset-y-0 w-16 bg-primary-foreground/25 blur-md"
              />
            </Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="ghost"
            className="rounded-2xl glass-dark text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
          >
            <Link to={hero.secondaryCta.to}>
              <Compass className="size-5" />
              {hero.secondaryCta.label}
            </Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="ghost"
            className="rounded-2xl text-primary-foreground/85 hover:bg-primary-foreground/15 hover:text-primary-foreground"
          >
            <Link to="/contact">
              <CalendarCheck className="size-5" />
              احجز زيارة
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-10 flex flex-wrap gap-2.5"
        >
          {hero.chips.map((label, i) => {
            const Icon = CHIP_ICONS[i % CHIP_ICONS.length]!;
            return (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-2 text-xs font-bold text-primary-foreground md:text-sm"
              >
                <Icon className="size-4 text-gold" />
                {label}
              </span>
            );
          })}
        </motion.div>
      </div>

      <WaveDivider className="z-30 text-background" />
    </section>
  );
}
