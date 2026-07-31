import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";

import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { siteIcon } from "@/features/site-content/icons";
import { Logo } from "./Logo";

export function Footer() {
  const { brand, contact, socials, nav, workingHours } = useSiteContent();
  const navItems = nav as { label: string; to: string }[];

  return (
    <footer data-site-footer className="mt-24 gradient-burgundy text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:px-8 lg:grid-cols-4">
        <div className="space-y-5">
          <div className="rounded-3xl bg-primary-foreground/10 p-4">
            <Logo inverted />
          </div>
          <p className="text-sm leading-relaxed text-primary-foreground/80">
            {brand.description}
          </p>
          <div className="flex gap-2">
            {socials.map((social) => {
              const Icon = siteIcon(social.icon);
              const className =
                "grid size-10 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground transition-colors hover:bg-primary-foreground/20";
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

        <div>
          <h3 className="text-base font-extrabold text-primary-foreground">روابط سريعة</h3>
          <ul className="mt-5 space-y-3">
            {navItems.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to as "/"}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-extrabold text-primary-foreground">معلومات التواصل</h3>
          <ul className="mt-5 space-y-4 text-sm text-primary-foreground/80">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>
                {contact.line1}، {contact.district}
                <br />
                {contact.city}، {contact.country}
              </span>
            </li>
            <li className="flex gap-3">
              <Phone className="size-4 shrink-0" />
              <a href={`tel:${contact.phoneIntl}`} dir="ltr" className="hover:text-primary-foreground">
                {contact.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <Mail className="size-4 shrink-0" />
              <a href={`mailto:${contact.email}`} dir="ltr" className="hover:text-primary-foreground">
                {contact.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-extrabold text-primary-foreground">أوقات العمل</h3>
          <ul className="mt-5 space-y-2 text-sm">
            {workingHours.map((row) => (
              <li
                key={row.day}
                className="flex items-center justify-between gap-3 border-b border-primary-foreground/10 pb-2 last:border-0"
              >
                <span className="text-primary-foreground/80">{row.day}</span>
                <span
                  className={
                    row.closed
                      ? "text-primary-foreground/50"
                      : "font-semibold text-primary-foreground"
                  }
                >
                  {row.hours}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-primary-foreground/70 md:flex-row md:px-8">
          <p>
            © {new Date().getFullYear()} {brand.name} — جميع الحقوق محفوظة.
          </p>
          <p>{brand.organization}</p>
        </div>
      </div>
    </footer>
  );
}