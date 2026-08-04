import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Mail, MapPin, Phone, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { siteIcon } from "@/features/site-content/icons";
import { legalDocPath, useVisibleLegalDocs } from "@/features/site-content/legal";
import { Logo } from "./Logo";

export function Footer() {
  const { brand, contact, socials, nav, workingHours, legal } = useSiteContent();
  const navItems = nav as { label: string; to: string }[];
  const legalDocs = useVisibleLegalDocs();

  return (
    <footer
      data-site-footer
      className="relative mt-32 overflow-hidden gradient-burgundy-deep text-primary-foreground"
    >
      <span aria-hidden className="pattern-noise absolute inset-0 opacity-70" />
      <span aria-hidden className="pattern-grid-light absolute inset-0 opacity-30 mask-fade-bottom" />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -top-32 start-1/3 size-[26rem] rounded-full bg-gold/20 blur-[110px]"
        animate={{ y: [0, 26, 0], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <span aria-hidden className="absolute inset-x-0 top-0 h-px gradient-gold-hairline" />

      {/* Call to action band */}
      <div className="relative mx-auto max-w-7xl px-4 pt-16 md:px-8">
        <div className="glass-dark relative overflow-hidden rounded-[2.5rem] px-7 py-9 md:px-12">
          <span
            aria-hidden
            className="animate-sheen pointer-events-none absolute inset-y-0 -start-1/3 w-1/3 bg-primary-foreground/12 blur-xl"
          />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-4 py-1.5 text-xs font-bold text-gold ring-gold-soft">
                <Sparkles className="size-3.5" />
                التسجيل مفتوح للعام الدراسي الجديد
              </span>
              <h2 className="mt-4 text-2xl leading-snug font-black text-primary-foreground md:text-3xl">
                مكان طفلك في <span className="text-gradient-gold">المنال</span> بانتظاره
              </h2>
              <p className="mt-2 text-sm text-primary-foreground/75">
                قدّم طلب التسجيل إلكترونيًا في دقائق، أو تواصل معنا لزيارة الروضة والتعرّف على بيئتها.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
                <Link to="/admissions">
                  ابدأ التسجيل
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/35 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <a href={`tel:${contact.phoneIntl}`}>اتصل بنا</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pt-16 pb-14 md:grid-cols-2 md:px-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <div className="w-fit rounded-3xl border border-primary-foreground/15 bg-primary-foreground/8 p-4 backdrop-blur-sm">
            <Logo inverted />
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/75">
            {brand.description}
          </p>
          <div className="flex gap-2.5">
            {socials.map((social) => {
              const Icon = siteIcon(social.icon);
              const className =
                "grid size-11 place-items-center rounded-2xl border border-primary-foreground/15 bg-primary-foreground/8 text-primary-foreground/90 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:bg-gold/20 hover:text-gold";
              return social.url ? (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={social.label}
                  aria-label={social.label}
                  className={className}
                >
                  <Icon className="size-4" />
                </a>
              ) : (
                <span key={social.label} title={social.label} aria-label={social.label} className={className}>
                  <Icon className="size-4" />
                </span>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3">
          <FooterTitle>روابط سريعة</FooterTitle>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {navItems.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to as "/"}
                  className="group inline-flex items-center gap-2 text-sm text-primary-foreground/75 transition-colors hover:text-gold"
                >
                  <span
                    aria-hidden
                    className="h-px w-4 bg-primary-foreground/30 transition-all duration-300 group-hover:w-7 group-hover:bg-gold"
                  />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <FooterTitle>معلومات التواصل</FooterTitle>
          <ul className="mt-6 space-y-4 text-sm text-primary-foreground/75">
            <li className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-foreground/8 text-gold">
                <MapPin className="size-4" />
              </span>
              <span className="leading-relaxed">
                {contact.line1}، {contact.district}
                <br />
                {contact.city}، {contact.country}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-foreground/8 text-gold">
                <Phone className="size-4" />
              </span>
              <a href={`tel:${contact.phoneIntl}`} dir="ltr" className="hover:text-gold">
                {contact.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-foreground/8 text-gold">
                <Mail className="size-4" />
              </span>
              <a href={`mailto:${contact.email}`} dir="ltr" className="hover:text-gold">
                {contact.email}
              </a>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-2">
          <FooterTitle>أوقات العمل</FooterTitle>
          <ul className="mt-6 space-y-2.5 text-sm">
            {workingHours.map((row) => (
              <li
                key={row.day}
                className="flex items-center justify-between gap-3 border-b border-dashed border-primary-foreground/12 pb-2 last:border-0"
              >
                <span className="text-primary-foreground/70">{row.day}</span>
                <span
                  dir="ltr"
                  className={
                    row.closed
                      ? "font-latin text-xs text-primary-foreground/45"
                      : "font-latin text-xs font-bold text-gold"
                  }
                >
                  {row.hours}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Transparency & policies band */}
      {legalDocs.length ? (
        <div className="relative mx-auto max-w-7xl px-4 pb-2 md:px-8">
          <div className="rounded-[2rem] border border-primary-foreground/12 bg-primary-foreground/6 px-6 py-6 backdrop-blur-sm md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <FooterTitle>{legal?.footerTitle || "الشفافية والسياسات"}</FooterTitle>
                {legal?.footerNote ? (
                  <p className="mt-3 max-w-xl text-xs leading-relaxed text-primary-foreground/60">
                    {legal.footerNote}
                  </p>
                ) : null}
              </div>
              <ul className="flex flex-wrap gap-2.5">
                {legalDocs.map((doc) => (
                  <li key={doc.slug}>
                    <Link
                      to={legalDocPath(doc.slug)}
                      className="group inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/8 px-4 py-2 text-xs font-bold text-primary-foreground/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:bg-gold/15 hover:text-gold"
                    >
                      {doc.navLabel}
                      <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {/* Oversized brand watermark */}
      <div aria-hidden className="relative mx-auto max-w-7xl px-4 md:px-8">
        <p className="number-ghost translate-y-2 text-center text-[15vw] leading-none whitespace-nowrap opacity-60 [-webkit-text-stroke:1.5px_oklch(1_0_0_/_0.14)]">
          {brand.name}
        </p>
      </div>

      <div className="relative border-t border-primary-foreground/12 bg-primary-foreground/4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-primary-foreground/65 md:flex-row md:px-8">
          <p>
            © {new Date().getFullYear()} {brand.name} — جميع الحقوق محفوظة.
          </p>
          <p className="flex items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-gold" />
            {brand.organization}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-3 text-sm font-extrabold tracking-wide text-primary-foreground">
      {children}
      <span aria-hidden className="h-px flex-1 bg-primary-foreground/15" />
    </h3>
  );
}