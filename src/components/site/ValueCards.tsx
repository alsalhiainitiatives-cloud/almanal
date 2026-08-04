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
      <div className="flex flex-wrap items-stretch justify-center gap-5 md:gap-7">
        {values.map((value, index) => {
          const Icon = siteIcon(value.icon);
          const isActive = index === active;
          return (
            <Reveal key={value.title} delay={index * 0.06}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-pressed={isActive}
                className={`group flex w-40 flex-col items-center gap-4 rounded-[1.75rem] border p-5 transition-all duration-500 md:w-48 md:p-6 ${
                  isActive
                    ? "border-gold/60 bg-card shadow-glow"
                    : "border-border/70 bg-card/70 hover:-translate-y-1 hover:border-gold/45"
                }`}
              >
                <span className="relative grid size-28 place-items-center md:size-32">
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
                    className={`relative size-12 transition-colors duration-500 md:size-14 ${
                      isActive ? "text-gold" : "text-secondary group-hover:text-primary"
                    }`}
                    strokeWidth={1.7}
                  />
                </span>
                <span
                  className={`text-center text-sm leading-snug font-black transition-colors duration-300 md:text-base ${
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
            <span aria-hidden className="number-ghost absolute top-4 end-8 text-6xl">
              {String(active + 1).padStart(2, "0")}
            </span>
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
