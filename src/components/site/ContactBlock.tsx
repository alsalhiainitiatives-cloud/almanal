import { Clock, MapPin, Phone } from "lucide-react";

import { school } from "@/data/site";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";

export function ContactBlock() {
  const { brand, contact, workingHours } = useSiteContent();

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Reveal direction="right" className="space-y-6">
        <div className="rounded-4xl bg-card p-8 shadow-card">
          <h3 className="text-2xl text-foreground">{brand.name}</h3>
          <p className="mt-1.5 text-sm font-semibold text-secondary">{brand.organization}</p>

          <ul className="mt-7 space-y-5 text-sm">
            <li className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                <MapPin className="size-5" />
              </span>
              <span className="text-muted-foreground">
                <span className="block font-bold text-foreground">العنوان</span>
                {contact.line1}، {contact.district}
                <br />
                {contact.city}، {contact.country}
              </span>
            </li>
            <li className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky text-primary">
                <Phone className="size-5" />
              </span>
              <span className="text-muted-foreground">
                <span className="block font-bold text-foreground">الهاتف</span>
                <a href={`tel:${contact.phoneIntl}`} dir="ltr" className="hover:text-primary">
                  {contact.phone}
                </a>
              </span>
            </li>
            <li className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint text-primary">
                <Clock className="size-5" />
              </span>
              <span className="w-full text-muted-foreground">
                <span className="block font-bold text-foreground">أوقات العمل</span>
                <ul className="mt-3 space-y-2">
                  {workingHours.map((row) => (
                    <li
                      key={row.day}
                      className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
                    >
                      <span>{row.day}</span>
                      <span
                        className={row.closed ? "text-muted-foreground/70" : "font-semibold text-foreground"}
                      >
                        {row.hours}
                      </span>
                    </li>
                  ))}
                </ul>
              </span>
            </li>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg">
              <a href={`tel:${contact.phoneIntl}`}>اتصل بالمدرسة</a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={contact.mapLink} target="_blank" rel="noreferrer">
                الاتجاهات على الخريطة
              </a>
            </Button>
          </div>
        </div>
      </Reveal>

      <Reveal direction="left">
        <div className="h-full min-h-96 overflow-hidden rounded-4xl bg-card shadow-card">
          <iframe
            title="موقع مدارس وروضة المنال على الخريطة"
            src={`https://www.google.com/maps?q=${school.mapQuery}&hl=ar&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="size-full min-h-96 border-0"
          />
        </div>
      </Reveal>
    </div>
  );
}