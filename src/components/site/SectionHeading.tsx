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
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground shadow-soft">
          <span aria-hidden className="size-2 rounded-full bg-gold" />
          {eyebrow}
        </span>
      ) : null}
      <h2 className="mt-4 text-3xl leading-tight font-black text-foreground md:text-[2.6rem]">
        {title}
      </h2>
      <svg
        aria-hidden
        viewBox="0 0 160 12"
        className={cn(
          "mt-3 h-3 w-36 text-gold",
          align === "center" ? "mx-auto" : "",
        )}
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