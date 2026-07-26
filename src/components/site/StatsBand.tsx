import { motion } from "motion/react";

import { stats } from "@/data/site";
import { Counter } from "./Counter";
import { staggerItem, StaggerGroup } from "./Reveal";

export function StatsBand() {
  return (
    <section className="section-y relative overflow-hidden gradient-burgundy">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-20 start-1/4 size-64 rounded-full bg-gold/25 blur-3xl"
        animate={{ y: [0, 24, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <StaggerGroup className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={staggerItem}>
              <p className="text-4xl font-extrabold text-primary-foreground md:text-5xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-3 text-sm font-semibold text-primary-foreground/75 md:text-base">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}