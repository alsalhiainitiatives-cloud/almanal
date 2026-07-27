import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MapPin, Phone, Send, Twitter } from "lucide-react";

import { navLinks, school, workingHours } from "@/data/site";
import { Logo } from "./Logo";

const socials = [
  { label: "تويتر / إكس", icon: Twitter },
  { label: "إنستقرام", icon: Instagram },
  { label: "تلقرام", icon: Send },
];

export function Footer() {
  return (
    <footer data-site-footer className="mt-24 gradient-burgundy text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:px-8 lg:grid-cols-4">
        <div className="space-y-5">
          <div className="rounded-3xl bg-primary-foreground/10 p-4">
            <Logo inverted />
          </div>
          <p className="text-sm leading-relaxed text-primary-foreground/80">
            {school.description}
          </p>
          <div className="flex gap-2">
            {socials.map(({ label, icon: Icon }) => (
              <span
                key={label}
                title={label}
                aria-label={label}
                className="grid size-10 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground transition-colors hover:bg-primary-foreground/20"
              >
                <Icon className="size-4" />
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-base font-extrabold text-primary-foreground">روابط سريعة</h3>
          <ul className="mt-5 space-y-3">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
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
                {school.address.line1}، {school.address.district}
                <br />
                {school.address.city}، {school.address.country}
              </span>
            </li>
            <li className="flex gap-3">
              <Phone className="size-4 shrink-0" />
              <a href={`tel:${school.phoneIntl}`} dir="ltr" className="hover:text-primary-foreground">
                {school.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <Mail className="size-4 shrink-0" />
              <a href={`mailto:${school.email}`} dir="ltr" className="hover:text-primary-foreground">
                {school.email}
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
            © {new Date().getFullYear()} {school.name} — جميع الحقوق محفوظة.
          </p>
          <p>{school.organization}</p>
        </div>
      </div>
    </footer>
  );
}