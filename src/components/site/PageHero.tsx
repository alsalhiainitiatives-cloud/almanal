import { motion } from "motion/react";
import type { ReactNode } from "react";

import { useSiteMedia } from "@/features/site-content/media";
import { images } from "@/data/gallery";
import { Doodle, WaveDivider } from "./Decor";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Shared inner-page hero: cinematic photographic background with a veiled,
 * animated headline block. Falls back to the campus photo when no CMS image set.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  image,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** https URL or `classroom-media` storage path. */
  image?: string;
  children?: ReactNode;
}) {
  const resolve = useSiteMedia([image]);
  const src = resolve(image) || images.campus;
  const words = title.split(" ");

  return (
    <section className="relative isolate overflow-hidden bg-primary pt-32 pb-32 md:pt-40 md:pb-44">
      <motion.img
        src={src}
        alt=""
        aria-hidden
        initial={{ scale: 1.14, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
        className="absolute inset-0 size-full object-cover"
      />
      <div aria-hidden className="absolute inset-0 gradient-hero-veil-soft" />
      <div aria-hidden className="absolute inset-0 bg-primary/25" />
      <div aria-hidden className="pattern-grid-light absolute inset-0 opacity-25" />
      <div
        aria-hidden
        className="animate-float-slower pointer-events-none absolute -top-24 -start-24 size-72 rounded-full bg-gold/25 blur-3xl"
      />
      <Doodle kind="arc" className="start-10 top-28 hidden text-gold/50 lg:block" />
      <Doodle kind="zigzag" className="end-12 top-36 hidden text-primary-foreground/25 lg:block" />

      <div className="relative z-20 mx-auto max-w-4xl px-4 text-center md:px-8">
        {eyebrow ? (
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-1.5 text-sm font-bold text-primary-foreground"
          >
            <span aria-hidden className="size-2 rounded-full bg-gold" />
            {eyebrow}
          </motion.span>
        ) : null}

        <h1 className="mt-5 text-4xl leading-tight font-black text-primary-foreground md:text-[3.4rem]">
          <span className="sr-only">{title}</span>
          <span aria-hidden className="flex flex-wrap justify-center gap-x-3">
            {words.map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.08 + i * 0.06, ease: EASE }}
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
          transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
          aria-hidden
          style={{ width: "7rem", height: "0.35rem" }}
          className="mx-auto mt-6 block rounded-full gradient-gold"
        />

        {description ? (
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.34, ease: EASE }}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-primary-foreground/85 md:text-lg"
          >
            {description}
          </motion.p>
        ) : null}

        {children ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.42, ease: EASE }}
            className="mt-8"
          >
            {children}
          </motion.div>
        ) : null}
      </div>

      <WaveDivider className="z-30 text-background" />
    </section>
  );
}
