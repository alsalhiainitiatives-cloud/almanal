import { motion } from "motion/react";

import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { Counter } from "./Counter";
import { staggerItem, StaggerGroup } from "./Reveal";
import { WaveDivider } from "./Decor";

export function StatsBand() {
  const { stats } = useSiteContent();
  return (
    <section className="relative overflow-hidden gradient-burgundy-deep pt-28 pb-28 md:pt-36 md:pb-36">
      <WaveDivider position="top" className="text-background" />
      <span className="pattern-grid-light absolute inset-0 opacity-30" aria-hidden />
      <span className="pattern-noise absolute inset-0 opacity-60" aria-hidden />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-20 start-1/4 size-72 rounded-full bg-gold/25 blur-[100px]"
        animate={{ y: [0, 24, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-20 mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-3 text-xs font-black tracking-[0.2em] text-gold uppercase">
            <span aria-hidden className="h-px w-10 gradient-gold-hairline" />
            المنال بالأرقام
            <span aria-hidden className="h-px w-10 gradient-gold-hairline" />
          </span>
          <h2 className="mt-4 text-2xl font-black text-primary-foreground md:text-3xl">
            ثقة تكبر عامًا بعد عام
          </h2>
        </div>
        <StaggerGroup className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-[2.25rem] border border-primary-foreground/12 bg-primary-foreground/10 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={staggerItem}
              className="group relative overflow-hidden bg-primary/25 px-4 py-10 backdrop-blur-sm transition-colors duration-500 hover:bg-primary-foreground/10"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  backgroundImage:
                    "radial-gradient(60% 60% at 50% 0%, oklch(0.79 0.12 82 / 0.22) 0%, transparent 70%)",
                }}
              />
              <p className="relative font-latin text-[2.6rem] leading-none font-black text-primary-foreground md:text-6xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </p>
              <span
                aria-hidden
                className="relative mx-auto mt-4 block h-0.5 w-8 rounded-full bg-gold transition-all duration-500 group-hover:w-16"
              />
              <p className="relative mt-4 text-sm font-bold text-primary-foreground/75 md:text-base">
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