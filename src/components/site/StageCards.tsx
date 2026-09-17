import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { stages } from "@/data/site";
import { stageImages } from "@/data/gallery";
import { staggerItem, StaggerGroup } from "./Reveal";

const toneChip: Record<string, string> = {
  rose: "bg-accent text-secondary",
  mint: "bg-mint text-primary",
  sky: "bg-sky text-primary",
};

/**
 * Editorial "portrait tile" stage cards: tall photographic tiles with a
 * burgundy wash, a gold hairline that draws on hover and a sliding detail
 * panel — closed by a deep burgundy enrolment tile.
 * `withDetails` adds the full programme list under each tile (/admissions).
 */
export function StageCards({ withDetails = false }: { withDetails?: boolean }) {
  return (
    <StaggerGroup
      className={`grid gap-4 sm:grid-cols-2 ${withDetails ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
    >
      {stages.map((stage, index) => (
        <motion.article
          key={stage.slug}
          variants={staggerItem}
          className="group relative isolate flex flex-col overflow-hidden rounded-[2rem] shadow-card ring-gold-soft"
        >
          <div className="relative h-full min-h-[26rem] overflow-hidden">
            <img
              src={stageImages[stage.slug]}
              alt={`${stage.title} — مدارس وروضة المنال بعنيزة`}
              width={900}
              height={1400}
              loading="lazy"
              className="absolute inset-0 size-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.1]"
            />
            <span
              aria-hidden
              className="absolute inset-0 bg-linear-to-t from-primary via-primary/45 to-primary/5 transition-opacity duration-700 group-hover:from-primary group-hover:via-primary/60"
            />
            <span
              aria-hidden
              className="animate-sheen pointer-events-none absolute -inset-y-10 -start-1/3 w-1/3 bg-linear-to-r from-transparent via-primary-foreground/25 to-transparent opacity-0 group-hover:opacity-100"
            />

            <span
              className={`absolute top-4 start-4 rounded-full px-3 py-1 text-[0.68rem] font-black shadow-card ${toneChip[stage.tone] ?? toneChip.rose}`}
            >
              {stage.age}
            </span>
            <span aria-hidden className="number-ghost absolute top-3 end-5 text-4xl">
              {String(index + 1).padStart(2, "0")}
            </span>

            <div className="absolute inset-x-0 bottom-0 p-5 text-center">
              <h3 className="text-xl font-black text-primary-foreground drop-shadow md:text-2xl">
                {stage.title}
              </h3>
              <span
                aria-hidden
                className="mx-auto mt-3 block h-0.5 w-8 rounded-full bg-gold transition-all duration-500 group-hover:w-20"
              />
              <div className="grid transition-all duration-500 ease-out [grid-template-rows:0fr] group-hover:[grid-template-rows:1fr]">
                <div className="overflow-hidden">
                  <p className="pt-4 text-xs leading-relaxed text-primary-foreground/85">
                    {stage.short}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-gold">
                    اعرف المزيد وسجّل
                    <ArrowLeft className="size-4" />
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/admissions"
              aria-label={stage.title}
              className="absolute inset-0 z-10 rounded-[2rem] focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            />
          </div>

          {withDetails ? (
            <ul className="space-y-2.5 bg-card px-6 py-6 text-sm text-muted-foreground">
              {stage.details.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-gold/25 text-gold-foreground">
                    <Check className="size-2.5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </motion.article>
      ))}

      {withDetails ? null : (
        <motion.div
          variants={staggerItem}
          className="relative isolate flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-[2rem] gradient-burgundy-deep p-7 text-center ring-gold-soft"
        >
          <span aria-hidden className="pattern-dots-light absolute inset-0 opacity-30" />
          <span
            aria-hidden
            className="animate-float-slower pointer-events-none absolute -top-16 -end-10 size-48 rounded-full bg-gold/20 blur-3xl"
          />
          <div className="relative">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl glass-dark text-gold">
              <Sparkles className="size-6" />
            </span>
            <p className="mt-6 text-2xl leading-snug font-black text-primary-foreground md:text-[1.7rem]">
              التسجيل مفتوح
              <br />
              لجميع المراحل
            </p>
            <span aria-hidden className="mx-auto mt-4 block h-0.5 w-14 rounded-full bg-gold" />
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/80">
              خطوات تسجيل إلكترونية بسيطة، ومتابعة لحظية لحالة طلبك حتى تسكين طفلك في فصله.
            </p>
          </div>
          <Button asChild variant="hero" size="lg" className="relative mt-8 w-full">
            <Link to="/admissions">
              ابدأ التسجيل الآن
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        </motion.div>
      )}
    </StaggerGroup>
  );
}
