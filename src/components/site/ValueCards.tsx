import { motion } from "motion/react";

import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { siteIcon } from "@/features/site-content/icons";
import { staggerItem, StaggerGroup } from "./Reveal";

const tones: Record<string, string> = {
  rose: "bg-accent text-primary",
  sky: "bg-sky text-primary",
  lavender: "bg-lavender text-primary",
  mint: "bg-mint text-primary",
  gold: "bg-gold/25 text-primary",
};

export function ValueCards() {
  const { values } = useSiteContent();
  return (
    <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {values.map((value, index) => {
        const Icon = siteIcon(value.icon);
        const tone = tones[value.tone] ?? tones.rose;
        return (
          <motion.div
            key={value.title}
            variants={staggerItem}
            className="premium-card group relative flex flex-col overflow-hidden rounded-[2.25rem] p-8"
          >
            <span
              aria-hidden
              className={`absolute -top-12 -end-12 size-36 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-90 ${tone}`}
            />
            <span
              aria-hidden
              className="number-ghost absolute top-5 end-7 text-5xl transition-all duration-500 group-hover:opacity-100"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={`relative grid size-14 place-items-center rounded-[1.25rem] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105 ${tone}`}
            >
              <Icon className="size-7" strokeWidth={2} />
            </span>
            <h3 className="relative mt-6 text-xl font-extrabold text-foreground">{value.title}</h3>
            <span
              aria-hidden
              className="relative mt-3 block h-0.5 w-10 rounded-full bg-gold transition-all duration-500 group-hover:w-20"
            />
            <p className="relative mt-4 text-sm leading-relaxed text-muted-foreground">
              {value.description}
            </p>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-8 bottom-0 h-px gradient-gold-hairline opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          </motion.div>
        );
      })}
    </StaggerGroup>
  );
}