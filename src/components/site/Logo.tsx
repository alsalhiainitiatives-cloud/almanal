import { GraduationCap } from "lucide-react";

import { useBrandLogoUrl, useSiteContent } from "@/features/site-content/SiteContentProvider";

export function Logo({
  inverted = false,
  variant = "full",
  size = "md",
}: {
  inverted?: boolean;
  /** "mark" renders the crest only — used on the auth screens. */
  variant?: "full" | "mark";
  size?: "md" | "lg";
}) {
  const { brand } = useSiteContent();
  const logoUrl = useBrandLogoUrl();
  const box = size === "lg" ? "size-20" : "size-11";
  const icon = size === "lg" ? "size-10" : "size-6";

  if (variant === "mark") {
    return logoUrl ? (
      <img
        src={logoUrl}
        alt={brand.name}
        className={`${box} shrink-0 object-contain`}
      />
    ) : (
      <span className={`grid ${box} shrink-0 place-items-center rounded-3xl gradient-burgundy shadow-soft`}>
        <GraduationCap className={`${icon} text-primary-foreground`} strokeWidth={2.2} />
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-3">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={brand.name}
          className="size-11 shrink-0 rounded-2xl object-contain shadow-soft"
        />
      ) : (
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl gradient-burgundy shadow-soft">
          <GraduationCap className="size-6 text-primary-foreground" strokeWidth={2.2} />
        </span>
      )}
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={
            inverted
              ? "truncate text-base font-extrabold text-primary-foreground"
              : "truncate text-base font-extrabold text-primary"
          }
        >
          {brand.name}
        </span>
        <span
          className={
            inverted
              ? "truncate text-[11px] text-primary-foreground/70"
              : "truncate text-[11px] text-muted-foreground"
          }
        >
          {brand.organization}
        </span>
      </span>
    </span>
  );
}