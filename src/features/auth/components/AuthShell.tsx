import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import authIllustration from "@/assets/auth-illustration.jpg";
import { Logo } from "@/components/site/Logo";
import { school } from "@/data/site";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden gradient-soft-cream">
      <div
        aria-hidden
        className="absolute -top-32 -start-24 size-[26rem] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -end-24 size-[30rem] rounded-full bg-gold/20 blur-3xl"
      />

      <div className="container relative mx-auto grid items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
        {/* Brand / illustration side */}
        <div className="order-2 hidden lg:order-1 lg:block">
          <div className="relative mx-auto max-w-lg">
            <div className="overflow-hidden rounded-[3rem] border border-border/60 bg-card shadow-soft">
              <img
                src={authIllustration}
                alt="أطفال روضة المنال يتعلمون مع معلمتهم"
                width={1024}
                height={1280}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 start-6 flex items-center gap-3 rounded-3xl border border-border/60 bg-card/95 px-5 py-3 shadow-soft backdrop-blur">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <div className="text-start">
                <p className="text-sm font-bold text-foreground">بوابة آمنة</p>
                <p className="text-xs text-muted-foreground">حماية كاملة لبيانات الأسرة</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form side */}
        <div className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-[2.5rem] border border-border/60 bg-card/85 p-6 shadow-soft backdrop-blur-xl sm:p-9">
            <div className="flex flex-col items-center text-center">
              <Logo className="h-12 w-auto" />
              <h1 className="mt-5 text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>

            <div className="mt-7">{children}</div>

            {footer && <div className="mt-6 text-center text-sm">{footer}</div>}

            <div className="mt-8 border-t border-border/60 pt-5 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primary/80"
              >
                <ArrowRight className="size-4" />
                العودة إلى موقع {school.shortName ?? "المنال"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}