import type { LucideIcon } from "lucide-react";

/** Friendly "coming soon" panel for Academic Tracking sections not built yet. */
export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
  bullets,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <div className="rounded-[2rem] border-2 border-dashed border-border/70 bg-card/70 p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary/10 text-primary">
        <Icon className="size-8" />
      </span>
      <h2 className="mt-5 text-lg font-black text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {bullets?.length ? (
        <ul className="mx-auto mt-6 grid max-w-2xl gap-2 text-start sm:grid-cols-2">
          {bullets.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-xs font-bold text-muted-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-6 inline-block rounded-full bg-gold/25 px-4 py-1.5 text-[11px] font-black text-foreground">
        قيد التطوير — قريبًا
      </p>
    </div>
  );
}
