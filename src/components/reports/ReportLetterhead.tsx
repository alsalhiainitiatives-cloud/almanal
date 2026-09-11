/**
 * Official letterhead + footer shared by every printable report (academic
 * reports, study plans, student file) so all documents carry the same brand
 * identity: logo, school name, organization, contact line and document badge.
 */
import { school } from "@/data/site";
import { useBrandLogoUrl } from "@/features/site-content/SiteContentProvider";
import { cn } from "@/lib/utils";

export function ReportLetterhead({
  documentTitle,
  badge,
  subtitle,
  meta = [],
  className,
}: {
  documentTitle: string;
  badge?: string | undefined;
  subtitle?: string | undefined;
  meta?: (string | null | undefined)[];
  className?: string | undefined;
}) {
  const logoUrl = useBrandLogoUrl();
  const lines = meta.filter((item): item is string => !!item && item !== "—");

  return (
    <header
      dir="rtl"
      className={cn(
        "print-avoid-break relative overflow-hidden rounded-[1.75rem] border border-primary/25 bg-gradient-to-l from-primary/10 via-card to-card p-5",
        className,
      )}
    >
      <span className="absolute inset-y-0 end-0 w-1.5 bg-primary/70" aria-hidden />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={school.name} className="size-16 shrink-0 object-contain" />
          ) : null}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">{school.organization}</p>
            <h2 className="text-lg font-black text-primary">{school.name}</h2>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {school.address.district} — {school.address.city} · هاتف{" "}
              <span dir="ltr">{school.phone}</span>
            </p>
          </div>
        </div>

        <div className="text-start">
          <span className="inline-block rounded-full bg-primary px-3 py-1 text-[11px] font-black text-primary-foreground">
            {badge ?? "مستند رسمي"}
          </span>
          <h3 className="mt-2 text-base font-black text-foreground">{documentTitle}</h3>
          {subtitle ? (
            <p className="text-[11px] font-bold text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>

      {lines.length ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/20 pt-3">
          {lines.map((line) => (
            <span
              key={line}
              className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary"
            >
              {line}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export function ReportSignatures({ roles }: { roles?: string[] }) {
  const list = roles ?? ["المعلمة المسؤولة", "المشرفة التربوية", "مديرة الروضة / المدرسة"];
  return (
    <footer dir="rtl" className="print-avoid-break grid gap-6 border-t border-border/60 pt-6 sm:grid-cols-3">
      {list.map((role) => (
        <div key={role} className="text-center">
          <p className="text-[11px] font-black text-foreground">{role}</p>
          <div className="mx-auto mt-8 w-4/5 border-t border-dashed border-foreground/40" />
          <p className="mt-1 text-[9px] text-muted-foreground">الاسم والتوقيع والتاريخ</p>
        </div>
      ))}
    </footer>
  );
}

export function ReportStamp({ note }: { note?: string }) {
  const issued = new Intl.DateTimeFormat("ar-SA", { dateStyle: "long", timeStyle: "short" }).format(
    new Date(),
  );
  return (
    <p className="text-center text-[9px] font-semibold text-muted-foreground">
      {note ?? `صدر هذا المستند إلكترونيًا من منصة ${school.name}`} · {issued}
    </p>
  );
}
