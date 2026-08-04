import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { siteIcon } from "@/features/site-content/icons";
import { Reveal } from "./Reveal";

const tones: Record<string, string> = {
  rose: "bg-accent text-secondary",
  sky: "bg-sky text-primary",
  lavender: "bg-lavender text-primary",
  mint: "bg-mint text-primary",
  gold: "bg-gold/25 text-gold-foreground",
};

/**
 * Interactive "orbit" values selector: organic blob tiles the visitor taps to
 * reveal a premium detail panel — keeps the section compact instead of a tall
 * card grid.
 */
export function ValueCards() {
  const { values } = useSiteContent();
  const [active, setActive] = useState(0);
  const current = values[active] ?? values[0];
  if (!current) return null;
  const CurrentIcon = siteIcon(current.icon);

  return (
    <div className="flex flex-col items-center gap-12">
      <div className="grid w-full grid-cols-2 items-stretch gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5">
        {values.map((value, index) => {
          const Icon = siteIcon(value.icon);
          const isActive = index === active;
          return (
            <Reveal key={value.title} delay={index * 0.06} className="h-full">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-pressed={isActive}
                className={`group flex h-full w-full flex-col items-center gap-4 rounded-[1.75rem] border-2 p-4 transition-all duration-500 lg:p-5 ${
                  isActive
                    ? "border-gold bg-card shadow-glow"
                    : "border-secondary/25 bg-card shadow-card hover:-translate-y-1 hover:border-gold/70"
                }`}
              >
                <span className="relative grid size-24 place-items-center lg:size-[6.5rem]">
                  <span
                    aria-hidden
                    className={`animate-blob absolute inset-0 border transition-all duration-500 ${
                      isActive
                        ? "border-gold/60 gradient-burgundy-deep shadow-glow"
                        : "border-border bg-accent/70 group-hover:border-gold/50"
                    }`}
                  />
                  <span
                    aria-hidden
                    className={`animate-spin-slow absolute -inset-2 rounded-full border border-dashed transition-opacity duration-500 ${
                      isActive ? "border-gold/50 opacity-100" : "opacity-0"
                    }`}
                  />
                  <Icon
                    className={`relative size-11 transition-colors duration-500 lg:size-12 ${
                      isActive ? "text-gold" : "text-secondary group-hover:text-primary"
                    }`}
                    strokeWidth={1.7}
                  />
                </span>
                <span
                  className={`text-center text-[0.82rem] leading-snug font-black transition-colors duration-300 lg:text-sm ${
                    isActive ? "text-secondary" : "text-foreground/75 group-hover:text-foreground"
                  }`}
                >
                  {value.title}
                </span>
              </button>
            </Reveal>
          );
        })}
      </div>

      <div className="w-full max-w-4xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="premium-card relative overflow-hidden rounded-[2.25rem] p-8 md:p-10"
          >
            <span
              aria-hidden
              className={`absolute -top-16 -end-16 size-48 rounded-full opacity-50 blur-3xl ${tones[current.tone] ?? tones.rose}`}
            />
            <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
              <span
                className={`grid size-16 shrink-0 place-items-center rounded-[1.4rem] ${tones[current.tone] ?? tones.rose}`}
              >
                <CurrentIcon className="size-8" strokeWidth={1.8} />
              </span>
              <div>
                <h3 className="text-2xl font-black text-foreground">{current.title}</h3>
                <span aria-hidden className="mt-3 block h-0.5 w-14 rounded-full bg-gold" />
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {current.description}
                </p>
              </div>
            </div>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-10 bottom-0 h-px gradient-gold-hairline"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
