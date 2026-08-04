import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-start",
        className,
      )}
    >
      {eyebrow ? (
        <span
          className={cn(
            "inline-flex items-center gap-3 text-xs font-black tracking-[0.18em] text-secondary uppercase",
            align === "center" ? "justify-center" : "",
          )}
        >
          <span aria-hidden className="h-px w-8 gradient-gold-hairline" />
          <span className="rounded-full bg-accent px-4 py-1.5 text-[0.72rem] tracking-normal text-accent-foreground shadow-soft">
            {eyebrow}
          </span>
          <span aria-hidden className="h-px w-8 gradient-gold-hairline" />
        </span>
      ) : null}
      <h2 className="mt-5 text-[1.95rem] leading-[1.15] font-black text-foreground md:text-[2.85rem]">
        {title}
      </h2>
      <svg
        aria-hidden
        viewBox="0 0 160 12"
        className={cn("mt-4 h-3 w-32 text-gold", align === "center" ? "mx-auto" : "")}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      >
        <path d="M4 8 C34 -2 54 10 82 6 C110 2 130 10 156 4" />
      </svg>
      {description ? (
        <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}