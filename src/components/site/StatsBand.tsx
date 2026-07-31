import { motion } from "motion/react";

import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { Counter } from "./Counter";
import { staggerItem, StaggerGroup } from "./Reveal";
import { WaveDivider } from "./Decor";

export function StatsBand() {
  const { stats } = useSiteContent();
  return (
    <section className="relative overflow-hidden gradient-burgundy pt-24 pb-24 md:pt-32 md:pb-32">
      <WaveDivider position="top" className="text-background" />
      <div className="pattern-dots-light absolute inset-0 opacity-40" aria-hidden />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-20 start-1/4 size-64 rounded-full bg-gold/30 blur-3xl"
        animate={{ y: [0, 24, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-20 mx-auto max-w-7xl px-4 md:px-8">
        <StaggerGroup className="grid grid-cols-2 gap-6 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={staggerItem}
              whileHover={{ y: -6 }}
              className="rounded-[2rem] border border-primary-foreground/15 bg-primary-foreground/8 px-4 py-8 backdrop-blur-sm"
            >
              <p className="font-latin text-4xl font-black text-primary-foreground md:text-5xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </p>
              <span
                aria-hidden
                className="mx-auto mt-3 block h-1 w-10 rounded-full bg-gold"
              />
              <p className="mt-3 text-sm font-bold text-primary-foreground/80 md:text-base">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
      <WaveDivider className="text-background" />
    </section>
  );
}