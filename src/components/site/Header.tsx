import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Clock, LayoutDashboard, LogIn, MapPin, Menu, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { navLinks, school } from "@/data/site";
import { useAuth } from "@/features/auth/AuthProvider";
import { Logo } from "./Logo";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated, profile } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Top contact strip */}
      <div className="gradient-burgundy text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs font-semibold md:px-8">
          <a href={`tel:${school.phoneIntl}`} className="inline-flex items-center gap-2">
            <Phone className="size-3.5 text-gold" />
            <span dir="ltr">{school.phone}</span>
          </a>
          <span className="inline-flex items-center gap-2 text-primary-foreground/85">
            <Clock className="size-3.5 text-gold" />
            الأحد – الخميس · 7:00 ص – 12:30 م
          </span>
          <span className="hidden items-center gap-2 text-primary-foreground/85 sm:inline-flex">
            <MapPin className="size-3.5 text-gold" />
            {school.address.district}، عنيزة
          </span>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/90 shadow-card backdrop-blur-xl"
            : "bg-background/70 backdrop-blur-sm"
        }`}
      >
        <div
          className={`mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition-all duration-300 md:px-8 xl:grid-cols-[auto_1fr_auto] ${
            scrolled ? "py-2" : ""
          }`}
        >
        <Link to="/" className="min-w-0" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center justify-center gap-1 rounded-full bg-accent/50 p-1.5 xl:flex">
          {navLinks.map((link) =>
            "children" in link ? (
              <div key={link.to} className="group relative">
                <Link
                  to={link.to}
                  className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold text-muted-foreground transition-all group-hover:bg-card group-hover:text-primary group-hover:shadow-soft data-[status=active]:bg-card data-[status=active]:text-primary data-[status=active]:shadow-soft"
                >
                  {link.label}
                  <ChevronDown className="size-3.5 transition-transform group-hover:rotate-180" />
                </Link>
                <div className="invisible absolute start-1/2 top-full z-50 w-64 -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="rounded-3xl border border-border/60 bg-card p-2 shadow-card">
                    {link.children.map((child) => (
                      <Link
                        key={child.to}
                        to={child.to}
                        className="block rounded-2xl px-4 py-3 text-start transition-colors hover:bg-accent"
                      >
                        <span className="block text-sm font-black text-foreground">
                          {child.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {child.desc}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              className="rounded-full px-4 py-2 text-sm font-bold text-muted-foreground transition-all hover:bg-card hover:text-primary hover:shadow-soft data-[status=active]:bg-card data-[status=active]:text-primary data-[status=active]:shadow-soft"
            >
              {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button variant="hero" size="default" className="hidden sm:inline-flex" asChild>
              <Link to="/dashboard">
                <LayoutDashboard className="size-4" />
                {profile?.fullName?.split(" ")[0] ?? "لوحتي"}
              </Link>
            </Button>
          ) : (
            <Button variant="hero" size="default" className="hidden sm:inline-flex" asChild>
              <Link to="/auth">
                <LogIn className="size-4" />
                تسجيل الدخول
              </Link>
            </Button>
          )}
          <Button
            variant="soft"
            size="icon"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            className="xl:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
        </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/70 bg-background/95 backdrop-blur-xl xl:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 md:px-8">
              {navLinks.map((link) => (
                <div key={link.to} className="flex flex-col">
                  <Link
                  key={link.to}
                  to={link.to}
                  activeOptions={{ exact: link.to === "/" }}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-primary data-[status=active]:bg-accent data-[status=active]:text-primary"
                >
                  {link.label}
                  </Link>
                  {"children" in link
                    ? link.children
                        .filter((c) => c.to !== link.to)
                        .map((child) => (
                          <Link
                            key={child.to}
                            to={child.to}
                            onClick={() => setOpen(false)}
                            className="ms-4 rounded-2xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-primary data-[status=active]:bg-accent data-[status=active]:text-primary"
                          >
                            {child.label}
                          </Link>
                        ))
                    : null}
                </div>
              ))}
              <Button variant="hero" size="lg" className="mt-2 w-full sm:hidden" asChild>
                <Link to={isAuthenticated ? "/dashboard" : "/auth"} onClick={() => setOpen(false)}>
                  {isAuthenticated ? "لوحتي" : "تسجيل الدخول"}
                </Link>
              </Button>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </header>
    </>
  );
}