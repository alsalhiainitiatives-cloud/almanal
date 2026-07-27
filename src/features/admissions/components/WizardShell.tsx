import type { ComponentType, ReactNode } from "react";
import { Check, CloudUpload, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type WizardStep = {
  id: number;
  label: string;
  short: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

/**
 * Premium wizard chrome: progress ring, horizontal stepper, autosave status
 * and a sticky action bar. Purely presentational.
 */
export function WizardShell({
  steps,
  activeIndex,
  stageName,
  saving,
  savedAt,
  onJump,
  children,
  footer,
}: {
  steps: WizardStep[];
  activeIndex: number;
  stageName: string;
  saving: boolean;
  savedAt: string | null;
  onJump: (id: number) => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const active = steps[activeIndex];
  const percent = Math.round(((activeIndex + 1) / steps.length) * 100);
  const ActiveIcon = active?.icon;

  return (
    <section className="section-y">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        {/* Header card */}
        <div className="overflow-hidden rounded-[2.5rem] bg-card shadow-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 gradient-burgundy px-6 py-6 text-primary-foreground sm:px-8">
            <div className="flex min-w-0 items-center gap-4">
              {ActiveIcon ? (
                <span className="grid size-14 shrink-0 place-items-center rounded-3xl bg-primary-foreground/15">
                  <ActiveIcon className="size-6" />
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-primary-foreground/75">
                  طلب قبول {stageName ? `— ${stageName}` : ""}
                </p>
                <h1 className="truncate text-2xl font-black leading-tight sm:text-3xl">
                  {active?.label}
                </h1>
                <p className="mt-1 line-clamp-2 text-xs text-primary-foreground/80 sm:text-sm">
                  {active?.description}
                </p>
              </div>
            </div>

            <ProgressRing percent={percent} />
          </div>

          {/* Stepper */}
          <nav aria-label="خطوات الطلب" className="px-4 py-5 sm:px-8">
            <ol className="flex items-start gap-1.5 overflow-x-auto pb-1">
              {steps.map((s, i) => {
                const done = i < activeIndex;
                const current = i === activeIndex;
                const Icon = s.icon;
                return (
                  <li key={s.id} className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => (i <= activeIndex ? onJump(s.id) : undefined)}
                      disabled={i > activeIndex}
                      aria-current={current ? "step" : undefined}
                      className={cn(
                        "group flex w-full flex-col items-center gap-2",
                        i <= activeIndex ? "cursor-pointer" : "cursor-default",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-full rounded-full transition-colors",
                          done || current ? "gradient-burgundy" : "bg-border",
                        )}
                      />
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-xl border-2 transition",
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : current
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                      </span>
                      <span
                        className={cn(
                          "hidden truncate text-[11px] font-black sm:block",
                          current
                            ? "text-primary"
                            : done
                              ? "text-foreground"
                              : "text-muted-foreground",
                        )}
                      >
                        {s.short}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
              <p className="text-xs font-bold text-muted-foreground">
                الخطوة {activeIndex + 1} من {steps.length}
              </p>
              <span className="flex items-center gap-2 rounded-full bg-beige px-3 py-1.5 text-xs font-bold text-foreground">
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> جارٍ الحفظ التلقائي
                  </>
                ) : savedAt ? (
                  <>
                    <CloudUpload className="size-3.5 text-mint-foreground" /> تم حفظ المسودة
                  </>
                ) : (
                  <>يتم حفظ تقدّمك تلقائيًا</>
                )}
              </span>
            </div>
          </nav>
        </div>

        {/* Body */}
        <div className="mt-8">{children}</div>

        {/* Sticky actions */}
        <div className="sticky bottom-4 z-20 mt-10">
          <div className="rounded-[2rem] border-2 border-border/70 bg-card/95 p-4 shadow-card backdrop-blur">
            {footer}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative hidden size-[72px] shrink-0 sm:block">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="opacity-25"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * percent) / 100}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-black" dir="ltr">
        {percent}%
      </span>
    </div>
  );
}
