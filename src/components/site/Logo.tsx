import { GraduationCap } from "lucide-react";
import { school } from "@/data/site";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl gradient-burgundy shadow-soft">
        <GraduationCap className="size-6 text-primary-foreground" strokeWidth={2.2} />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={
            inverted
              ? "truncate text-base font-extrabold text-primary-foreground"
              : "truncate text-base font-extrabold text-primary"
          }
        >
          {school.name}
        </span>
        <span
          className={
            inverted
              ? "truncate text-[11px] text-primary-foreground/70"
              : "truncate text-[11px] text-muted-foreground"
          }
        >
          {school.organization}
        </span>
      </span>
    </span>
  );
}