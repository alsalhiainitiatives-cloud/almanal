import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Clock, LayoutDashboard, LogIn, MapPin, Menu, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { Logo } from "./Logo";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated, profile } = useAuth();
  const { contact, nav } = useSiteContent();
  const navItems = nav as { label: string; to: string }[];

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
          <a href={`tel:${contact.phoneIntl}`} className="inline-flex items-center gap-2">
            <Phone className="size-3.5 text-gold" />
            <span dir="ltr">{contact.phone}</span>
          </a>
          <span className="inline-flex items-center gap-2 text-primary-foreground/85">
            <Clock className="size-3.5 text-gold" />
            {contact.hoursSummary}
          </span>
          <span className="hidden items-center gap-2 text-primary-foreground/85 sm:inline-flex">
            <MapPin className="size-3.5 text-gold" />
            {contact.district}، {contact.city.replace(/\s*\d+$/, "")}
          </span>
        </div>
      </div>

      <header
        data-site-header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/90 shadow-card backdrop-blur-xl"
            : "bg-background/70 backdrop-blur-sm"
        }`}
      >
        <div
          className={`mx-auto grid w-full max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-all duration-300 md:px-6 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-4 2xl:px-10 ${
            scrolled ? "py-2" : ""
          }`}
        >
        <Link to="/" className="min-w-0" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden min-w-0 items-center justify-center gap-0.5 rounded-full bg-accent/50 p-1.5 xl:flex xl:gap-1">
          {navItems.map((link) => (
            <Link
              key={link.to}
              to={link.to as "/"}
              activeOptions={{ exact: link.to === "/" }}
              className="whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-bold text-muted-foreground transition-all hover:bg-card hover:text-primary hover:shadow-soft data-[status=active]:bg-card data-[status=active]:text-primary data-[status=active]:shadow-soft xl:px-3.5 xl:text-sm 2xl:px-4"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated ? (
            <>
            <NotificationBell />
            <Button variant="hero" size="default" className="hidden sm:inline-flex" asChild>
              <Link to="/dashboard">
                <LayoutDashboard className="size-4" />
                {profile?.fullName?.split(" ")[0] ?? "لوحتي"}
              </Link>
            </Button>
            </>
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
              {navItems.map((link) => (
                <div key={link.to} className="flex flex-col">
                  <Link
                  key={link.to}
                  to={link.to as "/"}
                  activeOptions={{ exact: link.to === "/" }}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-primary data-[status=active]:bg-accent data-[status=active]:text-primary"
                >
                  {link.label}
                  </Link>
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