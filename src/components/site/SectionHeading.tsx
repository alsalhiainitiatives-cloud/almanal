import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  invert = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  className?: string;
  /** Light typography for dark (deep burgundy) sections. */
  invert?: boolean;
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
            invert && "text-gold",
          )}
        >
          <span aria-hidden className="h-px w-8 gradient-gold-hairline" />
          <span
            className={cn(
              "rounded-full px-4 py-1.5 text-[0.72rem] tracking-normal shadow-soft",
              invert
                ? "glass-dark text-primary-foreground"
                : "bg-accent text-accent-foreground",
            )}
          >
            {eyebrow}
          </span>
          <span aria-hidden className="h-px w-8 gradient-gold-hairline" />
        </span>
      ) : null}
      <h2
        className={cn(
          "mt-5 text-[1.95rem] leading-[1.15] font-black md:text-[2.85rem]",
          invert ? "text-primary-foreground" : "text-foreground",
        )}
      >
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
        <p
          className={cn(
            "mt-5 text-base leading-relaxed md:text-lg",
            invert ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}