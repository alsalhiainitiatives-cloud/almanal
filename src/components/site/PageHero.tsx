import { motion } from "motion/react";
import type { ReactNode } from "react";

import { Doodle, WaveDivider } from "./Decor";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden gradient-soft-cream pt-16 pb-28 md:pt-24 md:pb-40">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -start-24 size-72 rounded-full bg-lavender/70 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -end-16 size-80 rounded-full bg-sky/70 blur-3xl"
      />
      <Doodle kind="arc" className="start-10 top-24 hidden text-gold/70 lg:block" />
      <Doodle kind="zigzag" className="end-12 top-32 hidden text-secondary/35 lg:block" />
      <div className="relative z-20 mx-auto max-w-4xl px-4 text-center md:px-8">
        {eyebrow ? (
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm font-bold text-primary shadow-card ring-1 ring-accent"
          >
            <span aria-hidden className="size-2 rounded-full bg-gold" />
            {eyebrow}
          </motion.span>
        ) : null}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-5 text-4xl leading-tight font-black text-foreground md:text-[3.4rem]"
        >
          {title}
        </motion.h1>
        {description ? (
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            {description}
          </motion.p>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
      <WaveDivider className="text-background" />
    </section>
  );
}