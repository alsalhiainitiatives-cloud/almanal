import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export type SectionTone = "plain" | "beige" | "deep" | "soft";

const toneClass: Record<SectionTone, string> = {
  plain: "bg-background",
  beige: "bg-beige/60",
  soft: "gradient-soft-cream",
  deep: "gradient-burgundy-deep text-primary-foreground",
};

/**
 * Unified premium wrapper for every public section (home + inner pages).
 * Keeps eyebrow/title/description, ghost numbering, decorative layers and the
 * "linked page" CTA identical across the site so a home section and its own
 * page always look like one family.
 */
export function SectionShell({
  id,
  index,
  tone = "plain",
  eyebrow,
  title,
  description,
  align = "center",
  ctaLabel,
  ctaTo,
  ctaVariant = "soft",
  width = "wide",
  className,
  bodyClassName,
  children,
}: {
  id?: string;
  /** Ghost number shown as an editorial marker (e.g. 2 -> "02"). */
  index?: number;
  tone?: SectionTone;
  eyebrow?: string;
  title?: string;
  description?: string;
  align?: "center" | "start";
  ctaLabel?: string;
  ctaTo?: string;
  ctaVariant?: "soft" | "hero" | "outline";
  width?: "wide" | "narrow" | "mid";
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const deep = tone === "deep";
  const maxW = width === "narrow" ? "max-w-3xl" : width === "mid" ? "max-w-6xl" : "max-w-7xl";

  return (
    <section
      id={id}
      className={cn("section-y relative isolate overflow-hidden scroll-mt-24", toneClass[tone], className)}
    >
      {deep ? (
        <>
          <div aria-hidden className="pattern-noise absolute inset-0 opacity-70" />
          <div
            aria-hidden
            className="animate-float-slower pointer-events-none absolute -top-32 -start-24 size-96 rounded-full bg-gold/12 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px gradient-gold-hairline"
          />
        </>
      ) : (
        <div aria-hidden className="pattern-dots pointer-events-none absolute inset-0 opacity-25" />
      )}

      {index ? (
        <span
          aria-hidden
          className={cn(
            "number-ghost pointer-events-none absolute -top-2 select-none text-[7rem] md:text-[11rem]",
            align === "start" ? "end-4 md:end-10" : "start-4 md:start-10",
            deep && "opacity-70 [-webkit-text-stroke:1.5px_oklch(0.79_0.12_82_/_0.35)]",
          )}
        >
          {String(index).padStart(2, "0")}
        </span>
      ) : null}

      <div className={cn("relative z-10 mx-auto px-4 md:px-8", maxW)}>
        {title ? (
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description || undefined}
            align={align}
            invert={deep}
          />
        ) : null}
        <div className={cn(title ? "mt-14" : "", bodyClassName)}>{children}</div>
        {ctaLabel && ctaTo ? (
          <Reveal delay={0.15} className={cn("mt-12", align === "start" ? "" : "text-center")}>
            <Button asChild variant={deep ? "hero" : ctaVariant} size="lg">
              <Link to={ctaTo}>
                {ctaLabel}
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
