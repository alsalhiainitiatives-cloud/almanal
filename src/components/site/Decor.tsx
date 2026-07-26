import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

/**
 * Soft wavy divider used between sections. Colour comes from `currentColor`,
 * so set it with a text-* utility (e.g. text-background, text-beige).
 */
export function WaveDivider({
  position = "bottom",
  className,
  variant = "soft",
}: {
  position?: "top" | "bottom";
  className?: string;
  variant?: "soft" | "deep";
}) {
  const path =
    variant === "deep"
      ? "M0,64 C180,150 380,0 640,44 C900,88 1120,180 1440,96 L1440,200 L0,200 Z"
      : "M0,96 C240,20 420,140 720,110 C1020,80 1200,10 1440,72 L1440,200 L0,200 Z";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 leading-none",
        position === "bottom" ? "bottom-0" : "top-0 rotate-180",
        className,
      )}
    >
      <svg
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        className="h-12 w-full md:h-20"
        fill="currentColor"
      >
        <path d={path} />
      </svg>
    </div>
  );
}

/** Hand-drawn style doodles that give the pages a playful, kid-friendly feel. */
export function Doodle({
  kind,
  className,
}: {
  kind: "spark" | "arc" | "zigzag" | "dots" | "plane" | "loop";
  className?: string;
}) {
  const shapes: Record<string, ReactElement> = {
    spark: (
      <path
        d="M32 4 L38 24 L58 32 L38 40 L32 60 L26 40 L6 32 L26 24 Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    ),
    arc: <path d="M4 52 C16 12 48 12 60 52" strokeWidth="3" strokeLinecap="round" />,
    zigzag: <path d="M4 44 L18 20 L32 44 L46 20 L60 44" strokeWidth="3" strokeLinecap="round" />,
    dots: (
      <>
        <circle cx="12" cy="16" r="3.5" />
        <circle cx="32" cy="16" r="3.5" />
        <circle cx="52" cy="16" r="3.5" />
        <circle cx="12" cy="40" r="3.5" />
        <circle cx="32" cy="40" r="3.5" />
        <circle cx="52" cy="40" r="3.5" />
      </>
    ),
    plane: (
      <path
        d="M6 34 L58 10 L40 56 L32 38 Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    ),
    loop: (
      <path
        d="M6 46 C6 22 26 14 34 30 C40 42 26 50 22 40 C18 28 40 8 60 18"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    ),
  };

  const filled = kind === "dots";

  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      className={cn("pointer-events-none absolute size-16", className)}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
    >
      {shapes[kind]}
    </svg>
  );
}

/** Continuous ticker band with school highlights. */
export function MarqueeBand({ items }: { items: string[] }) {
  const loop = [...items, ...items];

  return (
    <div className="relative overflow-hidden gradient-burgundy py-5">
      <div className="pattern-dots-light absolute inset-0 opacity-40" aria-hidden />
      <div className="animate-marquee relative flex w-max items-center gap-10 pe-10">
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex items-center gap-10 text-lg font-extrabold whitespace-nowrap text-primary-foreground/90 md:text-2xl"
          >
            {item}
            <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-gold" fill="currentColor">
              <path d="M12 2l2.6 6.5L21 11l-6.4 2.5L12 20l-2.6-6.5L3 11l6.4-2.5z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}