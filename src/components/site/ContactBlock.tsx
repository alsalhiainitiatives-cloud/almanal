import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { motion } from "motion/react";

import { school } from "@/data/site";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { Button } from "@/components/ui/button";
import { Reveal, staggerItem, StaggerGroup } from "./Reveal";

/** Premium contact panel shared by the home section and the /contact page. */
export function ContactBlock() {
  const { brand, contact, workingHours } = useSiteContent();

  const tiles = [
    {
      icon: MapPin,
      tone: "bg-accent",
      label: "العنوان",
      value: `${contact.line1}، ${contact.district}`,
      sub: `${contact.city}، ${contact.country}`,
      href: contact.mapLink,
      hrefLabel: "الاتجاهات",
      external: true,
    },
    {
      icon: Phone,
      tone: "bg-sky",
      label: "الهاتف",
      value: contact.phone,
      sub: contact.hoursSummary,
      href: `tel:${contact.phoneIntl}`,
      hrefLabel: "اتصال",
      ltr: true,
    },
    {
      icon: Mail,
      tone: "bg-mint",
      label: "البريد الإلكتروني",
      value: contact.email,
      sub: "نجيب على الرسائل خلال يوم عمل",
      href: `mailto:${contact.email}`,
      hrefLabel: "مراسلة",
      ltr: true,
    },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-6">
        <Reveal direction="right">
          <div className="relative isolate overflow-hidden rounded-[2.5rem] gradient-burgundy-deep p-8 text-primary-foreground shadow-glow">
            <div aria-hidden className="pattern-noise absolute inset-0 opacity-70" />
            <div aria-hidden className="absolute inset-x-8 top-0 h-px gradient-gold-hairline" />
            <div className="relative">
              <h3 className="text-2xl font-black text-primary-foreground">{brand.name}</h3>
              <p className="mt-1.5 text-sm font-semibold text-gold">{brand.organization}</p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/80">
                {brand.tagline}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="lg">
                  <a href={`tel:${contact.phoneIntl}`}>اتصل بالمدرسة</a>
                </Button>
                <Button asChild variant="soft" size="lg">
                  <a href={contact.mapLink} target="_blank" rel="noreferrer">
                    الاتجاهات على الخريطة
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>

        <StaggerGroup className="grid gap-4 sm:grid-cols-2">
          {tiles.map((tile) => (
            <motion.a
              key={tile.label}
              variants={staggerItem}
              href={tile.href}
              {...(tile.external ? { target: "_blank", rel: "noreferrer" } : {})}
              className="premium-card group flex flex-col rounded-[1.85rem] p-6"
            >
              <span
                className={`grid size-11 place-items-center rounded-2xl text-primary transition-transform duration-500 group-hover:-rotate-6 ${tile.tone}`}
              >
                <tile.icon className="size-5" />
              </span>
              <span className="mt-4 text-xs font-black tracking-wide text-secondary">
                {tile.label}
              </span>
              <span
                className="mt-1 font-extrabold text-foreground"
                dir={tile.ltr ? "ltr" : undefined}
              >
                {tile.value}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-muted-foreground">{tile.sub}</span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                {tile.hrefLabel}
                <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
              </span>
            </motion.a>
          ))}

          <motion.div variants={staggerItem} className="premium-card rounded-[1.85rem] p-6">
            <span className="grid size-11 place-items-center rounded-2xl bg-lavender text-primary">
              <Clock className="size-5" />
            </span>
            <span className="mt-4 block text-xs font-black tracking-wide text-secondary">
              أوقات العمل
            </span>
            <ul className="mt-3 space-y-2 text-xs">
              {workingHours.map((row) => (
                <li
                  key={row.day}
                  className="flex items-center justify-between gap-3 border-b border-dashed border-border/70 pb-1.5 last:border-0"
                >
                  <span className="text-muted-foreground">{row.day}</span>
                  <span
                    className={
                      row.closed ? "text-muted-foreground/70" : "font-bold text-foreground"
                    }
                  >
                    {row.hours}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </StaggerGroup>
      </div>

      <Reveal direction="left">
        <div className="relative h-full min-h-[28rem] overflow-hidden rounded-[2.5rem] bg-card shadow-glow ring-gold-soft">
          <iframe
            title="موقع مدارس وروضة المنال على الخريطة"
            src={`https://www.google.com/maps?q=${school.mapQuery}&hl=ar&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="size-full min-h-[28rem] border-0"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px gradient-gold-hairline"
          />
        </div>
      </Reveal>
    </div>
  );
}
