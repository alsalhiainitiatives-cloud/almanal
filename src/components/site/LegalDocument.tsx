import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, FileText, MailQuestion, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";
import { SectionShell } from "@/components/site/SectionShell";
import { Reveal, staggerItem, StaggerGroup } from "@/components/site/Reveal";
import type { LegalDoc } from "@/features/site-content/defaults";
import { legalDocPath, useVisibleLegalDocs } from "@/features/site-content/legal";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";

/**
 * Shared renderer for every editable legal/policy page (privacy, terms, …).
 * Content comes entirely from site settings so admins control every word.
 */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const { brand, contact, pages } = useSiteContent();
  const docs = useVisibleLegalDocs();
  const others = docs.filter((item) => item.slug !== doc.slug);

  return (
    <>
      <PageHero
        eyebrow={doc.eyebrow}
        title={doc.title}
        description={doc.description}
        image={pages.about?.image}
      />

      <SectionShell id="policy" tone="soft" width="mid">
        <Reveal>
          <div className="premium-card relative overflow-hidden rounded-[2.5rem] p-7 md:p-10">
            <span aria-hidden className="absolute inset-x-10 top-0 h-px gradient-gold-hairline" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-black text-secondary">
                <ShieldCheck className="size-3.5" />
                {brand.name}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-beige px-4 py-1.5 text-xs font-bold text-muted-foreground">
                <CalendarClock className="size-3.5" />
                {doc.updatedLabel}
              </span>
            </div>
            <p className="mt-6 text-base leading-loose text-foreground/85">{doc.intro}</p>
          </div>
        </Reveal>

        {/* Index of clauses */}
        {doc.sections.length > 2 ? (
          <Reveal delay={0.1}>
            <nav
              aria-label="فهرس البنود"
              className="mt-8 rounded-[2rem] border border-dashed border-border bg-card/70 p-6"
            >
              <h2 className="flex items-center gap-2 text-sm font-black text-foreground">
                <FileText className="size-4 text-secondary" />
                فهرس البنود
              </h2>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {doc.sections.map((section, i) => (
                  <li key={section.heading}>
                    <a
                      href={`#clause-${i + 1}`}
                      className="group flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-secondary"
                    >
                      <span className="font-latin text-xs font-black text-gold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="group-hover:underline">{section.heading}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </Reveal>
        ) : null}

        <StaggerGroup className="mt-8 space-y-5">
          {doc.sections.map((section, i) => (
            <motion.article
              key={section.heading}
              id={`clause-${i + 1}`}
              variants={staggerItem}
              className="premium-card group scroll-mt-28 rounded-[2rem] p-7"
            >
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent font-latin text-xs font-black text-secondary transition-all duration-500 group-hover:gradient-gold group-hover:text-gold-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-foreground">{section.heading}</h2>
                  <span
                    aria-hidden
                    className="mt-3 block h-0.5 w-9 rounded-full bg-gold transition-all duration-500 group-hover:w-20"
                  />
                  <p className="mt-4 text-sm leading-loose whitespace-pre-line text-muted-foreground">
                    {section.body}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </StaggerGroup>

        <Reveal delay={0.15}>
          <div className="relative isolate mt-10 overflow-hidden rounded-[2.5rem] gradient-burgundy-deep p-8 text-primary-foreground shadow-glow">
            <div aria-hidden className="pattern-noise absolute inset-0 opacity-70" />
            <div aria-hidden className="absolute inset-x-10 top-0 h-px gradient-gold-hairline" />
            <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-4 py-1.5 text-xs font-bold text-gold ring-gold-soft">
                  <MailQuestion className="size-3.5" />
                  لديك استفسار؟
                </span>
                <p className="mt-4 text-sm leading-relaxed text-primary-foreground/85">
                  {doc.contactNote}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="hero" size="lg">
                  <Link to="/contact">تواصل معنا</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/35 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <a href={`tel:${contact.phoneIntl}`}>{contact.phone}</a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>

        {others.length ? (
          <Reveal delay={0.2}>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {others.map((item) => (
                <Link
                  key={item.slug}
                  to={legalDocPath(item.slug)}
                  className="premium-card group flex items-center justify-between gap-4 rounded-[1.85rem] p-6"
                >
                  <span>
                    <span className="block text-xs font-black text-secondary">{item.eyebrow}</span>
                    <span className="mt-1 block font-extrabold text-foreground">{item.navLabel}</span>
                  </span>
                  <ArrowLeft className="size-5 shrink-0 text-gold transition-transform duration-300 group-hover:-translate-x-1" />
                </Link>
              ))}
            </div>
          </Reveal>
        ) : null}
      </SectionShell>
    </>
  );
}

/** Shown when a legal slug is missing or hidden in site settings. */
export function LegalNotAvailable() {
  return (
    <div className="section-y mx-auto max-w-xl px-4 text-center">
      <p className="text-lg font-black text-foreground">هذه الصفحة غير متاحة حاليًا</p>
      <p className="mt-2 text-sm text-muted-foreground">
        قد تكون السياسة قيد التحديث من إدارة المدرسة. يمكنك التواصل معنا للاستفسار.
      </p>
      <Button asChild variant="soft" className="mt-6">
        <Link to="/contact">تواصل معنا</Link>
      </Button>
    </div>
  );
}
